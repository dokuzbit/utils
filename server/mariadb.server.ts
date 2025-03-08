import { createPool } from 'mariadb';
import type { Pool, PoolConnection, QueryOptions, SqlError, UpsertResult } from 'mariadb';
import cache from './cache.server';
import { merge, values } from 'lodash-es';


type joinType = 'LEFT' | 'RIGHT' | 'INNER' | 'OUTER' | 'CROSS';
type Where = string | string[] | Record<string, any> | Record<string, any>[];
type WhereParams = any | any[];
interface dbConfig {
	host?: string;
	user?: string;
	password?: string;
	database?: string;
	connectionLimit?: number;
	trace?: boolean;
	insertIdAsNumber?: boolean;
	decimalAsNumber?: boolean;
	namedPlaceholders?: boolean;
	rowsAsArray?: boolean;
	nestTables?: boolean;
	bigIntAsNumber?: boolean;
	dateStrings?: boolean;
}
interface QueryParams {
	command?: 'findFirst' | 'findMany' | 'findAll';
	select?: string | string[];
	from: string | string[];
	join?: string | string[];
	joinType?: joinType[] | joinType;
	where?: Where;
	whereParams?: any | any[];
	order?: string | string[];
	group?: string | string[];
	limit?: number;
	page?: number;
	offset?: number;
	chunk?: number | '?';
	options?: any;
	asArray?: boolean;
}

interface UpdateParams {
	table: string;
	values: Record<string, any>[] | Record<string, any>;
	where: Where;
	whereParams?: WhereParams;
}



/**
 * @class MariaDB
 * 
 * @property {Pool} pool - Database connection pool
 * @property {dbConfig} dbConfig - Database configuration
 * @property {typeof cache} cache - Cache instance
 * 
 * @method config - Configure the database connection
 * @method select - Select data from the database
 * @method update - Update data in the database
 * @method insert - Insert data into the database
 * @method upsert - Insert or update data into the database
 * @method delete - Delete data from the database
 * @method batch - Execute a batch of queries
 * @method batchUpdate - Update multiple records in the database
 * @method batchInsert - Insert multiple records into the database
 * @method batchDelete - Delete multiple records from the database
 */

export class MariaDB {
	private pool: Pool | undefined;
	private dbConfig: dbConfig | undefined;
	private cache: typeof cache = cache;
	constructor() {
	}

	config(dbConfig: dbConfig) {
		this.dbConfig = merge(this.dbConfig, dbConfig);
		this.dbConfig.trace = dbConfig.trace || process.env.NODE_ENV === 'development';
		this.dbConfig.connectionLimit = dbConfig.connectionLimit || 5;
		if (!this.dbConfig || !this.dbConfig.host || !this.dbConfig.database || !this.dbConfig.user || !this.dbConfig.password) throw new Error('database, user and password are required');
		if (!this.pool) this.pool = createPool(this.dbConfig);
	}




	// TODO: implement asArray
	// TODO: chunk & asArray ???
	async select(params: QueryParams): Promise<any> {
		if (!this.pool) return { error: 'pool is not initialized' };
		if (!params) return { error: 'params is required' };
		let { command, from, select = '*', join = [], joinType, where = '1=1', whereParams, order, group, limit, page, offset, chunk, options } = params;
		if (command === undefined) command = limit && limit > 1 ? 'findMany' : 'findFirst';
		if (command === 'findAll' && chunk === undefined) chunk = 0;
		if (chunk !== undefined) command = 'findAll'

		whereParams = this.buildWhereParams(where, whereParams)
		where = this.buildWhere(where)
		select = typeof select === 'string' ? select : select.join(',');
		join = typeof join === 'string' ? [join] : join;
		limit = command === 'findFirst' ? 1 : limit ? limit : 1000;
		offset = limit && command !== 'findFirst' && page ? (page - 1) * limit : offset;
		if (Array.isArray(from) && from.length - join.length != 1) return { error: 'Join count and from count mismatch' };

		if (joinType && typeof joinType != 'string' && joinType.length != join.length) return { error: 'Join type count and join count mismatch' };
		joinType = joinType && typeof joinType === 'string' ? [joinType] : joinType;

		if (Array.isArray(from)) {
			from.forEach((element, index) => {
				if (index > 0) {
					const jt = joinType ? joinType.length > 1 ? joinType[index - 1] : joinType[0] : 'LEFT';
					from += ` ${jt} JOIN ${element.trim()} ON ${join[index - 1]}`;
				} else from = element.trim();
			});
		} else from = from.trim();

		switch (command) {
			case 'findFirst':
			case 'findMany':
			case 'findAll':
				let sql = `SELECT ${select} FROM ${from}`;
				if (where) sql += ` WHERE ${where}`;
				if (order) sql += ` ORDER BY ${order}`;
				if (group) sql += ` GROUP BY ${group}`;
				if (chunk !== undefined) {
					const [first, last, total] = await this.getChunk(sql, chunk);
					if (chunk === '?') return { total }
					if (total && chunk >= total) return []
					sql = `SELECT ${select} FROM ${from} WHERE ${where} AND user.id >= ${first} AND user.id <= ${last}`;
					if (order) sql += ` ORDER BY ${order}`;
					if (group) sql += ` GROUP BY ${group}`;
				} else {
					// NOTE: need space after limit. We check for if includes 'limit 1 ' with one space to avoid confusion with 'limit 10'
					if (limit) sql += ` LIMIT ${limit} `;
					if (offset) sql += `OFFSET ${offset}`;
				}
				try {
					return await this.query(sql, whereParams);
				} catch (error: any) {
					return { error };
				}


		}
	}

	// TODO: refactor smilar to pagination and itteratable
	private async getChunk(sql: string, chunk: number | '?' = 0): Promise<[number | null, number | null, number | null]> {
		let chunkTable = await cache.get('chunk' + sql)
		if (!chunkTable) {
			chunkTable = []
			const data = await this.query(sql);
			if (data[0].id === undefined) throw new Error('id is required');
			chunkTable.push([data[0].id, data[data.length > 20 ? 20 - 1 : data.length - 1].id])
			for (let i = 20; i < data.length; i += 1000) {
				chunkTable.push([data[i].id, data[i + 1000 - 1 < data.length - 1 ? i + 1000 - 1 : data.length - 1].id])
			}
			cache.set('chunk' + sql, chunkTable);
		}
		if (chunk >= chunkTable.length) return [null, null, chunkTable.length]
		if (chunk === '?') return [null, null, chunkTable.length]
		return [chunkTable[chunk][0], chunkTable[chunk][1], chunkTable.length]
	}

	// DONE: all tests passed
	async update(params: UpdateParams): Promise<UpsertResult> {
		if (!params.where) throw new Error('where is required');
		let { table, values, where, whereParams } = params;
		// Type güvenliği için values'u Record<string, any>[] olarak dönüştürüyoruz
		const valuesArray: Record<string, any>[] = Array.isArray(values) ? values : [values];

		// Boş values dizisi kontrolü
		if (valuesArray.length === 0) {
			throw new Error('values is required');
		}

		// NOTE: whereParams must be built before where
		whereParams = this.buildWhereParams(where, whereParams);
		where = this.buildWhere(where);

		const sql = `UPDATE ${table} SET ${Object.keys(valuesArray[0])
			.map((key) => '`' + key + '` = ?')
			.join(',')} WHERE ${where}`;

		const placeholders = valuesArray.flatMap(Object.values);
		return await this.query(sql, [...placeholders, ...whereParams]);
	}

	/**
	 * Çoklu kayıt güncellemesi yapar
	 * 
	 * @param {string} options.table - Tablo adı
	 * @param {Array<Object>} options.values - Güncellenecek kayıtlar dizisi [{alan1: değer1, alan2: değer2, ...}, {...}]
	 * @param {string} options.whereField - Güncelleme için kullanılacak benzersiz alan adı (örn: "id")
	 * @returns {Promise<UpsertResult>} - İşlem sonucu
	 */
	async batchUpdate(options: { table: string; values: Record<string, any>[]; whereField?: string }): Promise<UpsertResult> {
		const { table, values, whereField = 'id' } = options;

		if (!table || !values || !whereField || !Array.isArray(values) || values.length === 0) throw new Error('Geçersiz parametreler: table, values (dizi olmalı) ve whereField zorunludur');

		if (values.some(record => whereField in record === false)) throw new Error(`Tüm kayıtlarda '${whereField}' alanı bulunmalıdır`);

		// Tüm kayıtlarda aynı alanların olduğunu kontrol et (whereField hariç)
		const firstRecordFields = Object.keys(values[0]).filter(field => field !== whereField);
		const allHaveSameFields = values.every(record => {
			const fields = Object.keys(record).filter(field => field !== whereField);
			return fields.length === firstRecordFields.length &&
				fields.every(field => firstRecordFields.includes(field));
		});

		if (!allHaveSameFields) throw new Error('Tüm kayıtlarda aynı alanlar bulunmalıdır');

		try {
			const fields = firstRecordFields;
			const setClause = fields.map(field => `${field} = ?`).join(', ');
			const query = `UPDATE ${table} SET ${setClause} WHERE ${whereField} = ?`;

			// Parametreleri hazırla
			const batchParams = values.map(record => {
				const whereValue = record[whereField];
				const values = fields.map(field => record[field]);
				return [...values, whereValue];
			});

			// Kendi batch metodunu kullan
			return await this.batch(query, batchParams);

		} catch (err) {
			console.error('Batch update hatası:', err);
			throw err;
		}
	}



	// DONE: insert single or batch
	async insert<T>(table: string, values: Record<string, any> | Record<string, any>[]): Promise<UpsertResult> {
		if (Array.isArray(values)) {
			// Boş dizi kontrolü ekleyelim
			if (values.length === 0) {
				throw new Error('Empty values array');
			}

			// İlk item'ın sütunlarını alalım
			const columns = Object.keys(values[0]);
			let sql = `INSERT INTO ${table} (${columns
				.map((key) => '`' + key + '`')
				.join(',')}) VALUES ${values
					.map(() => `(${columns.map(() => '?').join(',')})`)
					.join(', ')}`;

			const params = values.flatMap(Object.values);

			// TODO: daha iyi bir çözüm bul

			// replace ,not with ,`not` as not is a reserved word
			sql = sql.replace(/,not/g, ',`not`');
			return await this.batch(sql, params);
		} else {
			// Tek kayıt ekleme durumu
			const columns = Object.keys(values);
			let sql = `INSERT INTO ${table} (${columns.map(key => '`' + key + '`').join(',')}) VALUES (${columns
				.map(() => '?')
				.join(',')})`;
			// TODO: daha iyi bir çözüm bul
			// replace ,not with ,`not`
			sql = sql.replace(/,not/g, ',`not`');
			return await this.query(sql, Object.values(values));
		}
	}

	public async upsert<T>(table: string, values: Record<string, any>, update: Record<string, any>): Promise<any> {
		const sql = `INSERT INTO ${table} (${Object.keys(values).join(',')}) VALUES (${Object.keys(values)
			.map((key) => `?`)
			.join(',')}) ON DUPLICATE KEY UPDATE ${Object.keys(update)
				.map((key) => `${key} = ?`)
				.join(',')}`;
		return await this.query(sql, [...Object.values(values), ...Object.values(update)]);
	}


	// DONE: delete single or batch
	async delete<T>(table: string, where: string, params: any[] = []): Promise<T | null> {
		if (!table || !where) throw new Error('table and where is required');
		const sql = `DELETE FROM ${table} WHERE ${where}`;
		return await this.query(sql, params);
	}


	//---------------------------------------------------------------------------------------------------
	// Yardımcı fonksiyonlar - Private olabilir ama dışarıdan da erişilebilir
	//---------------------------------------------------------------------------------------------------

	public async query(sql: string | QueryOptions, values?: any, params: Record<string, any>[] = []): Promise<any> {
		if (!this.pool) return { error: 'pool is not initialized' };
		// Önce string sql ile object sql yapalım, böylece sonra çift kontrole gerek kalmayacak
		if (typeof sql === 'string') sql = { sql: sql, ...params }
		// Eğer values bir obje ise ve sql bir select ise namedPlaceholders'ı true yapalım
		if (sql.sql.toLowerCase().startsWith('select') && values?.constructor === Object) sql = { ...sql, namedPlaceholders: true }
		let result = await this.pool.query(sql, values);
		// Eğer result bir dizi ve tek bir eleman ise ve sql'de limit 1 varsa, o elemanı döndürelim
		if (result.length === 1 && (/\blimit\s+1\b/i.test(sql.sql))) return result[0]
		// if (sql.sql.toLowerCase().includes('limit 1 ') || sql.sql.toLowerCase().endsWith('limit 1')) return result[0]
		if (result.meta) result.meta = this.getColumnDefs(result.meta);
		return result
	}

	public async execute(sql: string | QueryOptions, values?: any, params: Record<string, any>[] = []): Promise<any> {
		if (!this.pool) return { error: 'pool is not initialized' };
		if (params.length > 0 && typeof sql === 'string') sql = { sql: sql, ...params }
		return await this.pool.execute(sql, values);
	}

	public async batch(sql: string | QueryOptions, values?: any[], params: Record<string, any>[] = []): Promise<UpsertResult> {
		if (!this.pool) throw new Error('pool is not initialized');
		if (params.length > 0 && typeof sql === 'string') sql = { sql: sql, ...params }
		const conn = await this.pool.getConnection();
		const result = await conn.batch<UpsertResult>(sql, values);
		conn.release();
		return result;
	}

	// ---------------------------------------------------------------------------------------------------
	// PRIVATE HELPER FUNCTIONS
	// ---------------------------------------------------------------------------------------------------
	private buildWhere(where: Where): string {
		// if where is empty, return 1=1
		if (!where) return '1=1'
		// if where is string, return it
		if (typeof where === 'string') return where
		// if where is array of strings, join them with AND
		if (Array.isArray(where) && where.length > 0 && typeof where[0] === 'string') return where.join(' AND ')
		// if where is object, convert to string
		if (typeof where === 'object' && !Array.isArray(where)) return Object.entries(where).map(([key, value]) => `${key} = ?`).join(' AND ')
		// if where is array of objects, convert to string
		if (Array.isArray(where) && where.length > 0 && typeof where[0] === 'object') {
			// Obje dizisini OR ile bağlıyoruz - her objeyi kendi içinde AND ile bağlıyoruz
			return where.map(w => {
				if (w && typeof w === 'object') {
					return '(' + Object.entries(w).map(([key, value]) => `${key} = ?`).join(' AND ') + ')';
				}
				return '';
			}).filter(Boolean).join(' OR ');
		}
		throw new Error('Invalid where type')
	}

	private buildWhereParams(where: Where, whereParams: WhereParams): any[] {
		if (whereParams) return Array.isArray(whereParams) ? whereParams : [whereParams]
		if (!where) return []
		if (typeof where === 'string') return []
		if (Array.isArray(where) && where.length > 0 && typeof where[0] === 'string') return []
		if (typeof where === 'object' && !Array.isArray(where)) return Object.values(where)
		if (Array.isArray(where) && where.length > 0 && typeof where[0] === 'object') {
			// Here, we're flattening the array of objects to get all values as a flat array
			return where.reduce((acc: any[], w) => {
				if (w && typeof w === 'object') {
					return [...acc, ...Object.values(w)];
				}
				return acc;
			}, []);
		}
		throw new Error('Invalid where type')
	}








	async getJsonValue(table: string, where: string, jsonField: string, path: string = '*') {
		const sql = `SELECT JSON_VALUE(${jsonField}, ?) as value FROM ${table} WHERE ${where} LIMIT 1`;
		return await this.query(sql, [`$.${path}`]);
	}

	async getJsonExtract(table: string, where: string, jsonField: string, path: string = '') {
		const sql = `SELECT JSON_EXTRACT(${jsonField}, ?) as value FROM ${table} WHERE ${where} LIMIT 1`;
		return (await this.query(sql, [path ? `$.${path}` : '$']))[0]?.value;
	}

	async setJsonValue(table: string, where: string, jsonField: string, path: string, value: any) {
		if (!where) throw new Error('where is required');
		const sql = `UPDATE ${table} SET ${jsonField} = JSON_SET(${jsonField}, ?, ?) WHERE ${where}`;
		return await this.query(sql, [`$.${path}`, value]);
	}
	async setJsonObject(table: string, where: string, jsonField: string, path: string, value: Record<string, any>) {
		if (!where) throw new Error('where is required');
		let flattenedValues: any;
		if (Array.isArray(value)) {
			flattenedValues = value.flat();
			const sql = `UPDATE ${table} SET ${jsonField} = JSON_SET(${jsonField}, ?, JSON_ARRAY(${flattenedValues})) WHERE ${where}`;
			return await this.query(sql, [`$.${path}`, ...flattenedValues]);
		} else {
			flattenedValues = Object.entries(value).flat();
			const sql = `UPDATE ${table} SET ${jsonField} = JSON_SET(${jsonField}, ?, JSON_OBJECT(${Array(flattenedValues.length / 2)
				.fill('?,?')
				.join(',')})) WHERE ${where}`;
			return await this.query(sql, [`$.${path}`, ...flattenedValues]);
		}
	}

	async findJsonValue(table: string, where: string, jsonField: string, path: string, value: any) {
		if (!where) where = '1=1';
		const sql = `SELECT * FROM ${table} WHERE ${where} AND JSON_VALUE(${jsonField}, ?) = ?`;
		return await this.query(sql, [`$.${path}`, value]);
	}

	async beginTransaction(): Promise<void> {
		if (!this.pool) throw new Error('Pool is not initialized');
		await this.pool.query('BEGIN');
	}

	async commit(): Promise<void> {
		if (!this.pool) throw new Error('Pool is not initialized');
		await this.pool.query('COMMIT');
	}

	async rollback(): Promise<void> {
		if (!this.pool) throw new Error('Pool is not initialized');
		await this.pool.query('ROLLBACK');
	}



	async close(): Promise<void> {
		if (this.pool) await this.pool.end();
	}

	private getColumnDefs(meta: any[]): any[] {
		if (!meta) return [];
		return meta.map(column => {
			return {
				field: column.name(),
				type: column.type,
			};
		});
	}


}
export const mariadb = new MariaDB();
export default mariadb;