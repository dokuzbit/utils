import { createPool } from 'mariadb';
import type { Pool, PoolConnection } from 'mariadb';
import cache from './cache';
const { DB_HOST, DB_USER, DB_PASS, DB_NAME } = process.env;

console.log(DB_HOST, DB_USER, DB_NAME);

type joinType = 'LEFT' | 'RIGHT' | 'INNER' | 'OUTER' | 'CROSS';
interface params {
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
class MariaDB {
	private pool: Pool;
	private dbConfig: any;
	private cache: typeof cache;
	constructor() {
		this.dbConfig = {
			host: DB_HOST || 'localhost',
			user: DB_USER,
			password: DB_PASS,
			database: DB_NAME,
			connectionLimit: process.env.NODE_ENV === 'development' ? 1 : 5,
			trace: process.env.NODE_ENV === 'development'
			// idleTimeout: process.env.NODE_ENV === 'development' ? 10 : 1000,
			// leakDetectionTimeout: process.env.NODE_ENV === 'development' ? 10 : 100
		};
		this.pool = createPool(this.dbConfig);
		this.cache = cache;
	}



	async q(params: params): Promise<any> {
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
		if (from.length - join.length != 1) return { error: 'Join count and from count mismatch' };
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

	async insert<T>(table: string, values: Record<string, any>): Promise<any> {
		const sql = `INSERT INTO ${table} (${Object.keys(values).join(',')}) VALUES (${Object.keys(values)
			.map((key) => `?`)
			.join(',')})`;
		return await this.query(sql, Object.values(values));
	}

	async upsert<T>(table: string, values: Record<string, any>, update: Record<string, any>): Promise<any> {
		const sql = `INSERT INTO ${table} (${Object.keys(values).join(',')}) VALUES (${Object.keys(values)
			.map((key) => `?`)
			.join(',')}) ON DUPLICATE KEY UPDATE ${Object.keys(update)
				.map((key) => `${key} = ?`)
				.join(',')}`;
		return await this.query(sql, [...Object.values(values), ...Object.values(update)]);
	}

	async update<T>(table: string, values: Record<string, any>, where: string, params: any[] = []): Promise<T | null> {
		if (!where) throw new Error('where is required');
		const sql = `UPDATE ${table} SET ${Object.keys(values)
			.map((key) => `${key} = ?`)
			.join(',')} WHERE ${where}`;
		return await this.query(sql, [...Object.values(values), ...params]);
	}

	async delete<T>(table: string, where: string, params: any[] = []): Promise<T | null> {
		if (!where) throw new Error('where is required');
		const sql = `DELETE FROM ${table} WHERE ${where}`;
		return await this.query(sql, params);
	}

	async query(sql: string, values?: any[], params?: any[]): Promise<any> {
		// console.log('📂 src/lib/server/mariaDB.ts 👉 91 👀 sql ➤ ', sql);
		// console.log('📂 src/lib/server/mariaDB.ts 👉 92 👀 values ➤ ', values);
		// console.log('📂 src/lib/server/mariaDB.ts 👉 93 👀 params ➤ ', params);
		let conn: PoolConnection | undefined;
		conn = await this.pool.getConnection();
		const q = Object.assign({ sql: sql, values: values }, ...(params || []));
		const result = conn.query(q);
		if (conn) conn.release();
		return result;
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

	async batch<T>(sql: string, params?: any[]): Promise<T[]> {
		let conn: PoolConnection | undefined;
		try {
			conn = await this.pool.getConnection();
			const result = await conn.batch(sql, params);
			return result;
		} catch (err) {
			console.error('Sorgu yürütme hatası:', err);
			throw err;
		} finally {
			if (conn) conn.release();
		}
	}

	async close(): Promise<void> {
		await this.pool.end();
	}
}
// Singleton örneği oluştur
export default new MariaDB();
