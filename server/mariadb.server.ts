import { createPool, type Pool } from 'mariadb';
import cache from './cache.server';

type QueryOptions = {
	sql: string;
	namedPlaceholders?: boolean;
	rowsAsArray?: boolean;
	nestTables?: boolean | string;
	dateStrings?: boolean;
	bigIntAsNumber?: boolean;
	insertIdAsNumber?: boolean;
	decimalAsNumber?: boolean;
	trace?: boolean;
	timeout?: number;
}

type SqlError = {
	code: string;
	errno: number;
	fatal: boolean;
	sql?: string;
	sqlState?: string;
	sqlMessage?: string;
}

type UpsertResult = {
	affectedRows: number;
	insertId: number | bigint;
	warningStatus: number;
} | { error: string };

type joinType = 'LEFT' | 'RIGHT' | 'INNER'
	| 'OUTER' | 'CROSS';
type Where = string | string[] | Record<string, any> | Record<string, any>[];
type WhereParams = any | any[];
type QueryResult<T> = T | null;
interface DBConfig {
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
	bigNumberStrings?: boolean;
	dateStrings?: boolean;
	collation?: string;
	charset?: string;
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
 * @description MariaDB class for database operations
 * 
 * @example
 * const db = new MariaDB();
 * await db.config({ host: 'localhost', user: 'root', password: 'password', database: 'test' });
 * const result = await db.query('SELECT * FROM users');
 * 
 * @description Fully tested methods with long-term support
 * @method query - Simple query method
 * @method objectUpdate - Update a single or multiple records with an object
 * @method insert - Insert a single or multiple records
 * @method upsert - Insert a single or multiple records with an update
 * @method delete - Delete a single or multiple records
 * 
 */
export class MariaDB {
	private pool: Pool | undefined;
	private dbConfig: DBConfig = {};
	private cache: typeof cache = cache;
	constructor(dbConfig?: DBConfig) {
		if (dbConfig) this.config(dbConfig);
	}

	/**
	 * @method config - Configure the database connection
	 * @param {dbConfig} dbConfig - Database configuratio
	 * @param dbConfig.host - Database host
	 * @param dbConfig.user - Database user
	 * @param dbConfig.password - Database password
	 * @param dbConfig.database - Database name
	 * @param dbConfig.connectionLimit - Database connection limit
	 * @param dbConfig.trace - Database trace
	 * 
	 */
	config(dbConfig: DBConfig) {
		this.dbConfig = mergeDeep(this.dbConfig, dbConfig);
		this.dbConfig.trace = dbConfig.trace || process.env.NODE_ENV === 'development';
		this.dbConfig.connectionLimit = dbConfig.connectionLimit || 5;
		if (!this.dbConfig || !this.dbConfig.host || !this.dbConfig.database || !this.dbConfig.user || !this.dbConfig.password) throw new Error('database, user and password are required');
		if (!this.pool) this.pool = createPool(this.dbConfig);
	}

	/**
	 * 
	 * @method query - Simple query method
	 * 
	 * @description Supports both named placeholders and positional placeholders depending on type of values
	 * @description If query includes limit 1, the result will be a single object, otherwise it will be an array
	 * 
	 * @param {string | QueryOptions} sql - SQL query
	 * @param {any[] | Record<string, any>} values - Query values
	 * @param {Record<string, any>[]} params - Query parameters
	 * @returns {Promise<T[] || T>} - Query result
	 * 
	 * @example simple with positional placeholders
	 * const result = await db.query('SELECT * FROM users WHERE id = ?', [1]);
	 * 
	 * @example simple with named placeholders
	 * const result = await db.query('SELECT * FROM users WHERE id = :id', { id: 1 });
	 * 
	 * @example object usuage with named placeholders and limit 1
	 * const result = await db.query({ sql: 'SELECT * FROM users WHERE id = :id limit 1', namedPlaceholders: true }, { id: 1 });
	 * @returns {Promise<T>} - Single object NOT array
	 */
	public async query<T>(sql: string | QueryOptions, values?: any[] | Record<string, any>, params: Record<string, any>[] = []): Promise<T | null> {
		if (!this.pool && this.dbConfig !== undefined) this.pool = createPool(this.dbConfig);
		if (!this.pool) this.pool = createPool(this.dbConfig);
		// Önce string sql ile object sql yapalım, böylece sonra çift kontrole gerek kalmayacak
		// if (typeof sql === 'string') sql = { sql: sql, ...params };
		if (typeof sql === 'string') {
			const options = params[0] || {};
			sql = { sql: sql, ...options };
		}

		// Eğer values bir obje ise ve sql bir select ise namedPlaceholders'ı true yapalım
		if (sql.sql.toLowerCase().startsWith('select') && values?.constructor === Object) sql = { ...sql, namedPlaceholders: true };
		let result
		try {
			result = await this.pool.query(sql, values);
		} catch (error: SqlError | any) {
			console.log(error.sqlMessage);
			return null as QueryResult<T>;
		}
		// Eğer result bir dizi ve tek bir eleman ise ve sql'de limit 1 varsa, o elemanı döndürelim
		if (Array.isArray(result) && result.length === 1 && (/\blimit\s+1\b/i.test(sql.sql))) {
			// Eğer result[0] ın tek bir key varsa, direkt value'yu döndür
			if (Object.keys(result[0]).length === 1) return result[0][Object.keys(result[0])[0]] as T;
			return result[0] as T;
		}
		if (Array.isArray(result) && result.length === 0 && (/\blimit\s+1\b/i.test(sql.sql))) {
			return null as T;
		}
		// if (sql.sql.toLowerCase().includes('limit 1 ') || sql.sql.toLowerCase().endsWith('limit 1')) return result[0]
		// if (result.meta) result.meta = this.getColumnDefs(result.meta);
		return result as T;
	}


	/**
	 * 
	 * @method objectUpdate - Update a single or multiple records with an object
	 * 
	 * @param {string} options.table - Table name
	 * @param {Array<Object> | Object} options.values - Records to update [{field1: value1, field2: value2, ...}, {...}]
	 * @param {string} options.whereField - Optional (default: "id") unique field name to update (e.g: "id")
	 * @returns {Promise<UpsertResult>} - Operation result
	 * 
	 * @example
	 * const result = await db.objectUpdate({ table: 'users', values: [{ id: 1, name: 'John' }] });
	 * 
	 * @example
	 * const result = await db.objectUpdate({ table: 'users', values: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }], whereField: 'id' });
	 * 
	 */

	async objectUpdate(options: { table: string; values: Record<string, any>[] | Record<string, any>; whereField?: string }): Promise<UpsertResult> {
		let { table, values, whereField = 'id' } = options;
		if (!Array.isArray(values)) values = [values] as Record<string, any>[];
		if (!table || !values || !whereField || !Array.isArray(values) || values.length === 0) throw new Error('Invalid parameters: table, values (array) and whereField are required');
		if (values.some(record => whereField in record === false)) throw new Error(`Tüm kayıtlarda '${whereField}' alanı bulunmalıdır`);

		// Check if all records have the same fields (except whereField)
		const firstRecordFields = Object.keys(values[0]).filter(field => field !== whereField);
		const allHaveSameFields = values.every(record => {
			const fields = Object.keys(record).filter(field => field !== whereField);
			return fields.length === firstRecordFields.length &&
				fields.every(field => firstRecordFields.includes(field));
		});

		if (!allHaveSameFields) throw new Error('All records must have the same fields');

		try {
			const fields = firstRecordFields;
			// Alan adlarını korumak için protectFieldName kullan
			const setClause = fields.map(field => `${this.protectFieldName(field)} = ?`).join(', ');
			const query = `UPDATE ${table} SET ${setClause} WHERE ${this.protectFieldName(whereField)} = ?`;

			// Prepare parameters
			const batchParams = values.map(record => {
				const whereValue = record[whereField];
				const values = fields.map(field => record[field]);
				return [...values, whereValue];
			});

			// Use own batch method
			const result = await this.batch(query, batchParams);

			// Check if result has error
			if (result && typeof result === 'object' && 'error' in result) {
				return result;
			}

			return result;

		} catch (err: any) {
			console.error('Batch update error:', err);
			return { error: err.message || 'Batch update failed' };
		}
	}


	/**
	 * @method insert - Insert a single or multiple records
	 * 
	 * @param {string} table - Table name
	 * @param {Record<string, any> | Record<string, any>[]} values - Records to insert [{field1: value1, field2: value2, ...}, {...}]
	 * @returns {Promise<UpsertResult>} - Operation result
	 * 
	 * @example single record
	 * const result = await db.insert('users', { name: 'John', email: 'john@example.com' });
	 * 
	 * @example multiple records
	 * const result = await db.insert('users', [{ name: 'John', email: 'john@example.com' }, { name: 'Jane', email: 'jane@example.com' }]);
	 * 
	 */

	async insert<T>(table: string, values: Record<string, any> | Record<string, any>[]): Promise<UpsertResult> {
		// Type safety, convert values to Record<string, any>[]
		const valuesArray: Record<string, any>[] = Array.isArray(values) ? values : [values];

		// Check if values array is empty
		if (valuesArray.length === 0) {
			return { affectedRows: 0, insertId: 0, warningStatus: 0 };
		}

		try {
			// All records must have the same fields
			const keys = Object.keys(valuesArray[0]);
			const protectedKeys = keys.map(key => this.protectFieldName(key));

			// Create placeholders for each record
			const placeholders = valuesArray.map(() => `(${keys.map(() => '?').join(',')})`).join(',');
			const flatValues = valuesArray.flatMap(v => keys.map(k => v[k]));

			// Create SQL query
			const sql = `INSERT INTO ${table} (${protectedKeys.join(',')}) VALUES ${placeholders}`;
			const result = await this.execute(sql, flatValues);

			// Check if result has error
			if (result && typeof result === 'object' && 'error' in result) {
				return result;
			}

			return result;
		} catch (err: any) {
			console.error('Insert error:', err);
			return { error: err.message || 'Insert failed' };
		}
	}


	/**
	 * @method upsert - Insert a single or multiple records with an update
	 * 
	 * @param {string} table - Table name
	 * @param {Record<string, any>} values - Record to insert
	 * @param {Record<string, any>} update - Record to update
	 * @returns {Promise<any>} - Operation result
	 * 
	 * @example single record
	 * const result = await db.upsert('users', { name: 'John', email: 'john@example.com' }, { email: 'john@example.com' });
	 * 
	 * @example multiple records
	 * const result = await db.upsert('users', [{ name: 'John', email: 'john@example.com' }, { name: 'Jane', email: 'jane@example.com' }], { email: 'john@example.com' });
	 * 
	 */

	public async upsert<T>(table: string, values: Record<string, any>, update: Record<string, any>): Promise<any> {
		try {
			const keys = Object.keys(values);
			const updateKeys = Object.keys(update);

			// Alan isimlerini koruma uygula
			const protectedKeys = keys.map(key => this.protectFieldName(key));

			const sql = `INSERT INTO ${table} (${protectedKeys.join(',')}) VALUES (${keys
				.map(() => `?`)
				.join(',')}) ON DUPLICATE KEY UPDATE ${updateKeys
					.map((key) => `${this.protectFieldName(key)} = ?`)
					.join(',')}`;

			const result = await this.query(sql, [...Object.values(values), ...Object.values(update)]);

			// Check if result has error
			if (result && typeof result === 'object' && 'error' in result) {
				return result;
			}

			return result;
		} catch (err: any) {
			console.error('Upsert error:', err);
			return { error: err.message || 'Upsert failed' };
		}
	}


	/**
	 * @method delete - Delete a single or multiple records
	 * 
	 * @param {string} table - Table name
	 * @param {string} where - Where clause
	 * @param {any[]} params - Query parameters
	 * @returns {Promise<UpsertResult>} - Operation result
	 * 
	 * @example
	 * const result = await db.delete('users', 'id = 1');
	 * 
	 * @example
	 * const result = await db.delete('users', 'id = 1', [1, 2, 3]);
	 */
	async delete<T>(table: string, where: string, params: any[] = []): Promise<UpsertResult> {
		if (!table || !where) return { error: 'table and where is required' };

		try {
			const sql = `DELETE FROM ${table} WHERE ${where}`;
			const result = await this.execute(sql, params);

			// Check if result has error
			if (result && typeof result === 'object' && 'error' in result) {
				return result;
			}

			return result;
		} catch (err: any) {
			console.error('Delete error:', err);
			return { error: err.message || 'Delete failed' };
		}
	}



	async update(params: UpdateParams): Promise<UpsertResult> {
		const { table, values, where, whereParams = [] } = params;
		if (!table || !values || !where) return { error: 'table, values, where is required' };

		try {
			// Güncellenecek değerler object veya object array olabilir
			const valuesArray = Array.isArray(values) ? values : [values];
			if (valuesArray.length === 0) return { error: 'values is empty' };

			const setValues = valuesArray.map(obj => {
				return Object.keys(obj).map(key => `${this.protectFieldName(key)} = ?`).join(', ');
			});

			const whereClause = this.buildWhere(where);
			const whereParamsProcessed = this.buildWhereParams(where, whereParams);

			// Update için SQL hazırla
			let sql = `UPDATE ${table} SET ${setValues.join(', ')} WHERE ${whereClause}`;

			const placeholders = valuesArray.flatMap(Object.values);
			const result = await this.query<UpsertResult>(sql, [...placeholders, ...whereParamsProcessed]);

			// Check if result has error
			if (result && typeof result === 'object' && 'error' in result) {
				return result;
			}

			return Array.isArray(result) ? result[0] : result;
		} catch (err: any) {
			console.error('Update error:', err);
			return { error: err.message || 'Update failed' };
		}
	}


	// TODO: implement asArray
	// TODO: chunk & asArray ???
	async select(params: QueryParams): Promise<any> {
		const { command = 'findMany', select = '*', from, join, joinType, where, whereParams, order, group, limit, page = 1, offset, chunk, options, asArray = false } = params;
		if (!from) return { error: 'from is required' };

		try {
			// Select field oluştur
			let selectClause: string;
			if (select === '*') {
				selectClause = '*';
			} else if (Array.isArray(select)) {
				selectClause = select.map(s => {
					// Eğer s bir string değil ise boş string dön
					if (typeof s !== 'string') return '';
					// Eğer s "as" içeriyor ise
					if (s.includes(' as ')) return s;
					// Eğer s "." ve "(" içeriyor ise, s'i doğrudan döndürelim
					if (s.includes('.') || s.includes('(')) return s;
					return this.protectFieldName(s);
				}).join(', ');
			} else if (typeof select === 'string') {
				if (select.includes(',')) {
					selectClause = select.split(',').map(s => {
						s = s.trim();
						// Eğer s "as" içeriyor ise
						if (s.includes(' as ')) return s;
						// Eğer s "." içeriyor ise veya "(" içeriyorsa, doğrudan döndür
						if (s.includes('.') || s.includes('(')) return s;
						return this.protectFieldName(s);
					}).join(', ');
				} else {
					selectClause = select;
				}
			} else {
				return { error: 'select must be string or array' };
			}

			// From kısmını hazırla, from array ise virguller ile ayır
			let fromClause: string;
			if (Array.isArray(from)) {
				fromClause = from.join(', ');
			} else {
				fromClause = from;
			}

			// Join kısmını hazırla
			let joinClause = '';
			if (join && join.length > 0) {
				const joins = Array.isArray(join) ? join : [join];
				const joinTypes = Array.isArray(joinType) ? joinType : joinType ? [joinType] : Array(joins.length).fill('LEFT');

				joinClause = joins.map((j, i) => {
					return `${joinTypes[i] || 'LEFT'} JOIN ${j}`;
				}).join(' ');
			}

			// Where kısmını hazırla
			let whereClause = '';
			if (where) {
				whereClause = `WHERE ${this.buildWhere(where)}`;
			}

			// Order kısmını hazırla
			let orderClause = '';
			if (order) {
				// Eğer order bir array değil ise, stringe çevir ve virgüller ile ayır
				const orderArray = Array.isArray(order) ? order : order.split(',');
				orderClause = `ORDER BY ${orderArray.join(', ')}`;
			}

			// Group kısmını hazırla
			let groupClause = '';
			if (group) {
				const groups = Array.isArray(group) ? group : [group];
				groupClause = `GROUP BY ${groups.join(', ')}`;
			}

			// Limit ve offset kısmını hazırla
			let limitClause = '';
			if (limit) {
				// Offset limit * (page - 1) olarak hesaplanır
				const offsetValue = offset || (limit * (page - 1));
				limitClause = `LIMIT ${offsetValue}, ${limit}`;
			}

			// Query oluştur
			const sql = `SELECT ${selectClause} FROM ${fromClause} ${joinClause} ${whereClause} ${groupClause} ${orderClause} ${limitClause}`.trim().replace(/\s+/g, ' ');
			const result = await this.query(sql, whereParams || [], options || {});

			// Check if result has error
			if (result && typeof result === 'object' && 'error' in result) {
				return result;
			}

			// findFirst should return first row
			if (command === 'findFirst' && Array.isArray(result) && result.length > 0) {
				return asArray ? [result[0]] : result[0];
			}
			return result;
		} catch (err: any) {
			console.error('Select error:', err);
			return { error: err.message || 'Select failed' };
		}
	}

	// TODO: refactor smilar to pagination and itteratable
	private async getChunk(sql: string, chunk: number | '?' = 0): Promise<[number | null, number | null, number | null]> {
		// sql hash al
		let chunkTable = cache.get('chunk' + sql) as any[];
		if (!chunkTable) {
			chunkTable = []
			const data = await this.query<Array<{ id: number }>>(sql);
			if (!Array.isArray(data) || data.length === 0) return [null, null, null];
			if (data[0].id === undefined) throw new Error('id is required');

			chunkTable.push([data[0].id, data[data.length > 20 ? 20 - 1 : data.length - 1].id])
			for (let i = 20; i < data.length; i += 1000) {
				chunkTable.push([data[i].id, data[i + 1000 - 1 < data.length - 1 ? i + 1000 - 1 : data.length - 1].id])
			}
			cache.set('chunk' + sql, chunkTable);
		}
		if (chunk === '?') return [null, null, chunkTable.length]
		if (chunk >= chunkTable.length) return [null, null, chunkTable.length]
		return [chunkTable[chunk][0], chunkTable[chunk][1], chunkTable.length]
	}








	//---------------------------------------------------------------------------------------------------
	// Yardımcı fonksiyonlar - Private olabilir ama dışarıdan da erişilebilir
	//---------------------------------------------------------------------------------------------------



	public async execute(sql: string | QueryOptions, values?: any, params: Record<string, any>[] = []): Promise<any> {
		if (!this.pool) return { error: 'pool is not initialized' };
		if (params.length > 0 && typeof sql === 'string') sql = { sql: sql, ...params };

		try {
			const result = await this.pool.execute(sql, values);
			return result;
		} catch (error: SqlError | any) {
			console.log(error.sqlMessage);
			return { error: error.code || 'unknown error' };
		}
	}

	public async batch(sql: string | QueryOptions, values?: any[], params: Record<string, any>[] = []): Promise<UpsertResult> {
		if (!this.pool) return { error: 'pool is not initialized' };
		if (params.length > 0 && typeof sql === 'string') sql = { sql: sql, ...params };

		try {
			const conn = await this.pool.getConnection();
			const result = await conn.batch<UpsertResult>(sql, values);
			conn.release();
			return result;
		} catch (error: SqlError | any) {
			console.log(error.sqlMessage);
			return { error: error.code || 'unknown error' };
		}
	}

	// ---------------------------------------------------------------------------------------------------
	// PRIVATE HELPER FUNCTIONS
	// ---------------------------------------------------------------------------------------------------
	private buildWhere(where: Where): string {
		// if where is empty, return 1=1
		if (!where) return '1 = 1';

		// if where is a string, return it as is
		if (typeof where === 'string') return where;

		// if where is an array of strings
		if (Array.isArray(where) && where.length > 0 && typeof where[0] === 'string') {
			return where.join(' AND ');
		}

		// if where is an object, like {name: 'test', age: 10}
		// return "name = 'test' AND age = 10"
		if (typeof where === 'object' && !Array.isArray(where)) {
			return Object.keys(where)
				.map((key) => {
					// Burada alan adı özel bir SQL kelimesi ise, backtick içinde koruyalım
					const safeKey = this.protectFieldName(key);
					return `${safeKey} = ?`;
				})
				.join(' AND ');
		}

		// if where is an array of objects, like [{name: 'test'}, {age: 10}]
		// return "name = 'test' OR age = 10"  - Bu durumda OR kullanıyoruz!
		if (Array.isArray(where) && where.length > 0 && typeof where[0] === 'object') {
			return where
				.map((obj) => {
					if (!obj) return '';
					return '(' + Object.keys(obj)
						.map((key) => {
							// Burada alan adı özel bir SQL kelimesi ise, backtick içinde koruyalım
							const safeKey = this.protectFieldName(key);
							return `${safeKey} = ?`;
						})
						.join(' AND ') + ')';
				})
				.filter(Boolean)
				.join(' OR '); // Burada OR kullanıyoruz, çünkü farklı koşullar arasında OR bağlacı mantıklı
		}

		return String(where);
	}

	private buildWhereParams(where: Where, whereParams: WhereParams): any[] {
		if (!where) return [];

		// Eğer whereParams belirtilmişse, doğrudan onları kullan
		if (whereParams !== undefined) {
			return Array.isArray(whereParams) ? whereParams : [whereParams];
		}

		// Eğer where bir obje ise (ejson sorgu formatı), değerleri whereParams olarak kullan
		if (typeof where === 'object' && !Array.isArray(where)) {
			return Object.values(where);
		}

		// Eğer where bir obje dizisi ise, tüm değerleri birleştir
		if (Array.isArray(where) && where.length > 0 && typeof where[0] === 'object') {
			return where.flatMap(obj => {
				if (!obj) return [];
				return Object.values(obj);
			});
		}

		return [];
	}

	private sanitizeSql(sql: string): string {
		return sql.replace(/,/g, '`');
	}






	async getJsonValue(table: string, where: string, jsonField: string, path: string = '*') {
		try {
			const sql = `SELECT JSON_VALUE(${jsonField}, ?) as value FROM ${table} WHERE ${where} LIMIT 1`;
			const result = await this.query(sql, [`$.${path}`]);

			// Check if result has error
			if (result && typeof result === 'object' && 'error' in result) {
				return result;
			}

			return result;
		} catch (err: any) {
			console.error('getJsonValue error:', err);
			return { error: err.message || 'getJsonValue failed' };
		}
	}

	async getJsonExtract(table: string, where: string, jsonField: string, path: string = '') {
		try {
			const sql = `SELECT JSON_EXTRACT(${jsonField}, ?) as value FROM ${table} WHERE ${where} LIMIT 1`;
			const result = await this.query<{ value: any }>(sql, [path ? `$.${path}` : '$']);

			// Check if result has error
			if (result && typeof result === 'object' && 'error' in result) {
				return result;
			}

			return Array.isArray(result) ? result[0]?.value : result;
		} catch (err: any) {
			console.error('getJsonExtract error:', err);
			return { error: err.message || 'getJsonExtract failed' };
		}
	}

	async setJsonValue(table: string, where: string, jsonField: string, path: string, value: any) {
		if (!where) return { error: 'where is required' };

		try {
			const sql = `UPDATE ${table} SET ${jsonField} = JSON_SET(${jsonField}, ?, ?) WHERE ${where}`;
			const result = await this.query(sql, [`$.${path}`, value]);

			// Check if result has error
			if (result && typeof result === 'object' && 'error' in result) {
				return result;
			}

			return result;
		} catch (err: any) {
			console.error('setJsonValue error:', err);
			return { error: err.message || 'setJsonValue failed' };
		}
	}

	async setJsonObject(table: string, where: string, jsonField: string, path: string, value: Record<string, any>) {
		if (!where) return { error: 'where is required' };

		try {
			let flattenedValues: any;
			if (Array.isArray(value)) {
				flattenedValues = value.flat();
				const sql = `UPDATE ${table} SET ${jsonField} = JSON_SET(${jsonField}, ?, JSON_ARRAY(${flattenedValues})) WHERE ${where}`;
				const result = await this.query(sql, [`$.${path}`, ...flattenedValues]);

				// Check if result has error
				if (result && typeof result === 'object' && 'error' in result) {
					return result;
				}

				return result;
			} else {
				flattenedValues = Object.entries(value).flat();
				const sql = `UPDATE ${table} SET ${jsonField} = JSON_SET(${jsonField}, ?, JSON_OBJECT(${Array(flattenedValues.length / 2)
					.fill('?,?')
					.join(',')})) WHERE ${where}`;
				const result = await this.query(sql, [`$.${path}`, ...flattenedValues]);

				// Check if result has error
				if (result && typeof result === 'object' && 'error' in result) {
					return result;
				}

				return result;
			}
		} catch (err: any) {
			console.error('setJsonObject error:', err);
			return { error: err.message || 'setJsonObject failed' };
		}
	}

	async findJsonValue(table: string, where: string, jsonField: string, path: string, value: any) {
		try {
			if (!where) where = '1=1';
			const sql = `SELECT * FROM ${table} WHERE ${where} AND JSON_VALUE(${jsonField}, ?) = ?`;
			const result = await this.query(sql, [`$.${path}`, value]);

			// Check if result has error
			if (result && typeof result === 'object' && 'error' in result) {
				return result;
			}

			return result;
		} catch (err: any) {
			console.error('findJsonValue error:', err);
			return { error: err.message || 'findJsonValue failed' };
		}
	}

	async beginTransaction(): Promise<void> {
		if (!this.pool) return { error: 'Pool is not initialized' } as any;

		try {
			await this.pool.query('BEGIN');
		} catch (error: SqlError | any) {
			console.error('beginTransaction error:', error.sqlMessage);
			return { error: error.sqlMessage } as any;
		}
	}

	async commit(): Promise<void> {
		if (!this.pool) return { error: 'Pool is not initialized' } as any;

		try {
			await this.pool.query('COMMIT');
		} catch (error: SqlError | any) {
			console.error('commit error:', error.sqlMessage);
			return { error: error.sqlMessage } as any;
		}
	}

	async rollback(): Promise<void> {
		if (!this.pool) return { error: 'Pool is not initialized' } as any;

		try {
			await this.pool.query('ROLLBACK');
		} catch (error: SqlError | any) {
			console.error('rollback error:', error.sqlMessage);
			return { error: error.sqlMessage } as any;
		}
	}



	async close(): Promise<void> {
		try {
			if (this.pool) await this.pool.end();
		} catch (error: SqlError | any) {
			console.error('close error:', error.sqlMessage);
			return { error: error.sqlMessage } as any;
		}
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

	// Özel alan adlarını koruyan yardımcı fonksiyon
	private protectFieldName(fieldName: string): string {
		// rezerve edilmiş SQL kelimelerini kontrol et
		const reservedWords = [
			'not', 'order', 'group', 'limit', 'offset', 'by', 'where', 'from', 'select',
			'update', 'delete', 'add', 'alter', 'column', 'table', 'into', 'set', 'values',
			'as', 'and', 'or', 'join', 'on', 'having', 'case', 'when', 'then', 'else', 'end',
			'like', 'in', 'between', 'is', 'null', 'asc', 'desc', 'distinct', 'all', 'exists',
			'any', 'some', 'inner', 'outer', 'left', 'right', 'full', 'cross', 'using', 'natural'
		];

		// Backtick kontrolü: Eğer alan adı zaten backtick içindeyse dokunma
		if (fieldName.startsWith('`') && fieldName.endsWith('`')) {
			return fieldName;
		}

		// Eğer alan adı tablonun bir parçasıysa (örn: "table.field") 
		// veya nokta içeriyorsa her bir parçayı ayrı ayrı koru
		if (fieldName.includes('.')) {
			const parts = fieldName.split('.');
			return parts.map(part => this.protectFieldName(part)).join('.');
		}

		// Rezerve kelimeler listesinde varsa veya özel karakterler içeriyorsa backtick içine al
		if (reservedWords.includes(fieldName.toLowerCase()) || /[^a-zA-Z0-9_]/.test(fieldName)) {
			return `\`${fieldName}\``;
		}

		return fieldName;
	}

	// Helper function to handle query results
	private handleQueryResult<T>(result: QueryResult<T>): T {
		if (result && typeof result === 'object' && 'error' in result) {
			throw new Error(result.error);
		}
		return result as T;
	}

}
export const mariadb = new MariaDB();
export default mariadb;

function mergeDeep(target: any, source: any): any {
	if (!target) return { ...source };
	if (!source) return { ...target };
	const output = { ...target };
	for (const key of Object.keys(source)) {
		if (
			source[key] &&
			typeof source[key] === 'object' &&
			!Array.isArray(source[key])
		) {
			output[key] = mergeDeep(target[key], source[key]);
		} else {
			output[key] = source[key];
		}
	}
	return output;
}