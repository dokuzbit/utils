import { createPool } from 'mariadb';
import type { Pool, PoolConnection, QueryOptions, UpsertResult } from 'mariadb';
import cache from './cache';

type dbConfig = {
	host?: string;
	user?: string;
	password?: string;
	database?: string;
	connectionLimit?: number;
	trace?: boolean;
}

type joinType = 'LEFT' | 'RIGHT' | 'INNER' | 'OUTER' | 'CROSS';
type QueryParams = {
	command?: 'findFirst' | 'findMany' | 'findAll';
	from: string | string[];
	select?: string | string[];
	join?: string | string[];
	joinType?: joinType[] | joinType;
	where?: string | string[];
	placeholders?: any | any[];
	order?: string | string[];
	group?: string | string[];
	limit?: number;
	page?: number;
	offset?: number;
	chunk?: number | '?';
	options?: any;
}

type UpdateParams = {
	table: string;
	values: Record<string, any>[] | Record<string, any>;
	where: string | string[] | Record<string, any> | Record<string, any>[];
}

class MariaDB {
	private pool: Pool | undefined;
	private dbConfig: dbConfig | undefined;
	private cache: typeof cache;
	constructor() {
		this.cache = cache;
	}

	config(dbConfig: dbConfig) {
		if (!dbConfig || !dbConfig.host || !dbConfig.database || !dbConfig.user || !dbConfig.password) throw new Error('database, user and password are required');
		this.dbConfig = dbConfig;
		this.dbConfig.trace = dbConfig.trace || process.env.NODE_ENV === 'development';
		this.dbConfig.connectionLimit = dbConfig.connectionLimit || 5;
		this.pool = createPool(this.dbConfig);
	}

	async select(params: QueryParams): Promise<any> {
		if (!this.pool) return { error: 'pool is not initialized' };
		if (!params) return { error: 'params is required' };
		let { command, from, select = '*', join = [], joinType, where = '1=1', placeholders, order, group, limit, page, offset, chunk, options } = params;
		if (command === undefined) command = limit && limit > 1 ? 'findMany' : 'findFirst';
		if (command === 'findAll' && chunk === undefined) chunk = 0;
		if (chunk !== undefined) command = 'findAll'

		where = typeof where === 'string' ? where : where?.join(' AND ');
		select = typeof select === 'string' ? select : select.join(',');
		join = typeof join === 'string' ? [join] : join;
		limit = command === 'findFirst' ? 1 : limit ? limit : 1000;
		offset = limit && command !== 'findFirst' && page ? (page - 1) * limit : offset;
		placeholders = typeof placeholders === 'string' ? [placeholders] : placeholders;
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
					if (limit) sql += ` LIMIT ${limit}`;
					if (offset) sql += ` OFFSET ${offset}`;
				}
				try {
					const result = await this.query(sql, placeholders);
					return command === 'findFirst' ? result[0] : result;
				} catch (error: any) {
					return { error };
				}


		}
	}

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

	// TODO: Work ongoing, where is ok
	async update<T>(params: UpdateParams): Promise<T | null> {
		if (!params.where) throw new Error('where is required');
		let { table, values, where } = params;
		if (!Array.isArray(values)) values = [values]
		// Eğer where string[] ise join edilir
		if (Array.isArray(where) && typeof where[0] === 'string') where = where.join(' AND ');
		if (Array.isArray(where) && typeof where[0] === 'object') where = where.map(w => Object.entries(w).map(([key, value]) => `${key} = '${value}'`).join(' AND ')).join(' AND ');

		// where: { name: 'test1', id: 1 }
		let wherePlaceholders: any[] = []
		if (typeof where === 'object' && !Array.isArray(where)) {
			wherePlaceholders = Object.values(where)
			where = Object.entries(where).map(([key, value]) => `${key} = ?`).join(' AND ');
		}

		where = typeof where === 'string' ? where : where?.join(' AND ');
		console.log('where:', where);

		const sql = `UPDATE ${table} SET ${Object.keys(values[0])
			.map((key) => `${key} = ?`)
			.join(',')} WHERE ${where}`;
		const placeholders = values.flatMap(Object.values)
		if (wherePlaceholders) placeholders.push(...wherePlaceholders)
		console.log(sql, placeholders);
		return await this.query(sql, placeholders);
	}

	// insert single or batch
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



	async delete<T>(table: string, where: string, params: any[] = []): Promise<T | null> {
		if (!where) throw new Error('where is required');
		const sql = `DELETE FROM ${table} WHERE ${where}`;
		return await this.query(sql, params);
	}


	//---------------------------------------------------------------------------------------------------
	// Yardımcı fonksiyonlar - Private olabilir ama dışarıdan da erişilebilir
	//---------------------------------------------------------------------------------------------------
	public async query(sql: string | QueryOptions, values?: any, params: Record<string, any>[] = []): Promise<any> {
		if (!this.pool) return { error: 'pool is not initialized' };
		if (params.length > 0 && typeof sql === 'string') sql = { sql: sql, ...params }
		return await this.pool.query(sql, values);
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
















	async getFirst(select: string = '*', from: string, where: string = '1=1', params: any[] = []): Promise<any> {
		const sql = `SELECT ${select} FROM ${from} WHERE ${where} LIMIT 1`;
		const result = await this.query(sql, params);
		return result.length > 0 ? result[0] : null;
	}

	// TODO: cache'i düzenle, select kısmını da cache'le
	async getAll(select: string = '*', from: string, where: string = '1=1', params: any[] = [], others: string = '', ttl?: number): Promise<any[]> {
		if (!where) where = '1=1';
		// Tablo isimlerini çıkar
		const tableNames = this.extractTableNames(from);
		// Cache key'i için tablo isimlerini birleştir
		const cacheKey = `${tableNames.join(':')}:${where}`;

		// Cache'i kontrol et
		const cached = await this.cache.get(cacheKey);
		// Cache'de veri varsa, veritabınından update time ları kontrol ederek cache'in eski olup olmadığını kontrol et
		if (cached) {
			console.log('cache var');
			const timeStamp = this.cache.getMeta(cacheKey)?.timeStamp;
			const sql = `SELECT table_name,update_time FROM information_schema.tables WHERE table_schema = '${DB_NAME}' AND table_name IN (${tableNames.map(name => `'${name}'`).join(',')}) AND UNIX_TIMESTAMP(update_time) > ${timeStamp}`;
			const row = await this.query(sql);
			if (row.length === 0) return cached;
		}
		console.log("db lookup");
		const sql = `SELECT ${select} FROM ${from} WHERE ${where} ${others}`;
		const data: any[] = await this.query(sql, params);
		if (ttl && ttl > 0) this.cache.set(cacheKey, data, ttl);
		return data;
	}

	// SELECT u.firma, u.name, u.lastname, u.ceptel, u.email, i.name
	// FROM user u
	// 	LEFT JOIN iller i on u.sehir = i.name

	private extractTableNames(fromClause: string): string[] {
		// SQL anahtar kelimelerini küçük harfe çevir
		const normalizedClause = fromClause.toLowerCase();

		// Tablo adı ve alias'ı ayır (örn: "user u" -> "user")
		const cleanedClause = normalizedClause.replace(/(\b\w+\b)\s+(?:as\s+)?([a-z])\b(?!\w)/g, '$1');

		// JOIN koşullarını ve ON ifadelerini temizle
		const withoutConditions = cleanedClause.replace(/\bon\b.*?(?=\b(left|right|inner|outer|cross)?\s*join\b|$)/g, ' ');

		// JOIN kelimelerini boşlukla değiştir
		const withoutJoins = withoutConditions.replace(/\b(left|right|inner|outer|cross)?\s*join\b/g, ' ');

		// Tablo isimlerini ayır
		const tables = withoutJoins
			.split(/[\s,]+/)
			.filter(part => part.length > 0)
			.filter(part => !['on', 'using', 'as'].includes(part))
			.map(table => table.trim());

		return [...new Set(tables)];
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
}
// Singleton örneği oluştur
export default new MariaDB();
