import { createPool } from 'mariadb';
import type { Pool, PoolConnection, QueryOptions, UpsertResult } from 'mariadb';
import cache from './cache';
import { merge } from 'lodash-es';


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



class MariaDB {
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
		this.pool = createPool(this.dbConfig);
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
		console.log(where);
		where = this.buildWhere(where)
		console.log(where);
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
		if (!Array.isArray(values)) values = [values]
		// NOTE: whereParams must be built before where
		whereParams = this.buildWhereParams(where, whereParams)
		where = this.buildWhere(where)
		const sql = `UPDATE ${table} SET ${Object.keys(values[0])
			.map((key) => `${key} = ?`)
			.join(',')} WHERE ${where}`;
		let placeholders = values.flatMap(Object.values)
		return await this.query(sql, [...placeholders, ...whereParams]);
	}

	// DONE: insert single or batch
	async insert<T>(table: string, values: Record<string, any> | Record<string, any>[]): Promise<any> {
		if (Array.isArray(values)) {
			const sql = `INSERT INTO ${table} (${Object.keys(values[0]).join(',')}) VALUES ${values
				.map(() => `(${Object.keys(values[0]).map(() => `?`).join(',')})`)
				.join(', ')}`;
			const params = values.flatMap(Object.values);
			return await this.batch(sql, params);
		} else {
			const sql = `INSERT INTO ${table} (${Object.keys(values).join(',')}) VALUES (${Object.keys(values)
				.map((key) => `?`)
				.join(',')})`;
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
		if (params.length > 0 && typeof sql === 'string') sql = { sql: sql, ...params }
		let result = await this.pool.query(sql, values);
		if(result.length === 1){
			if(typeof sql === 'string' && (sql.toLowerCase().includes('limit 1 ') || sql.toLowerCase().endsWith('limit 1'))) return result[0]
			if(typeof sql === 'object' && (sql.sql.toLowerCase().includes('limit 1 ') || sql.sql.toLowerCase().endsWith('limit 1'))) return result[0]
		}
		if (result.meta) result.meta = this.getColumnDefs(result.meta);
		return result
	}

	public async execute(sql: string | QueryOptions, values?: any, params: Record<string, any>[] = []): Promise<any> {
		if (!this.pool) return { error: 'pool is not initialized' };
		if (params.length > 0 && typeof sql === 'string') sql = { sql: sql, ...params }
		return await this.pool.execute(sql, values);
	}

	public async batch(sql: string | QueryOptions, values?: any[], params: Record<string, any>[] = []): Promise<UpsertResult | UpsertResult[] | { error: unknown }> {
		if (!this.pool) return { error: 'pool is not initialized' };
		if (params.length > 0 && typeof sql === 'string') sql = { sql: sql, ...params }
		const conn = await this.pool.getConnection();
		const result = await conn.batch(sql, values);
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
		if (Array.isArray(where) && typeof where[0] === 'string') return where.join(' AND ')
		// if where is object, convert to string
		if (typeof where === 'object') return Object.entries(where).map(([key, value]) => `${key} = ?`).join(' AND ')
		// if where is array of objects, convert to string
		if (Array.isArray(where) && typeof where[0] === 'object') return where.map(w => Object.entries(w).map(([key, value]) => `${key} = ?`).join(' AND ')).join(' AND ')
		throw new Error('Invalid where type')
	}

	private buildWhereParams(where: Where, whereParams: WhereParams): any[] {
		if (whereParams) return whereParams
		if (!where) return []
		if (typeof where === 'string') return []
		if (Array.isArray(where) && typeof where[0] === 'string') return []
		if (typeof where === 'object') return Object.values(where)
		if (Array.isArray(where) && typeof where[0] === 'object') return where.flatMap(w => Object.values(w))
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
		await this.pool.query('BEGIN');
	}

	async commit(): Promise<void> {
		await this.pool.query('COMMIT');
	}

	async rollback(): Promise<void> {
		await this.pool.query('ROLLBACK');
	}



	async close(): Promise<void> {
		await this.pool.end();
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
// Singleton örneği oluştur
export default new MariaDB();
