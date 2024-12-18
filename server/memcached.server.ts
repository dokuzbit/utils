import * as memjs from 'memjs';

/**
 * Memcached class to cache data
 * @lastModified 23.11.2024
 *
 * @method set
 * @param key - The key to set
 * @param value - The value to set
 * @param options - The options
 * @returns {Promise<any>} - The result of the set operation
 *
 * @method get
 * @param key - The key to get
 * @returns {Promise<any>} - The result of the get operation
 *
 * @method delete
 * @param key - The key to delete
 * @returns {Promise<any>} - The result of the delete operation
 *
 */
class Memcached {
	private cache: Record<string, { value: any; expires: number }> = {};
	private memcached: any;
	private readonly DEFAULT_EXPIRATION = 300; // Saniye cinsinden varsayılan sona erme süresi

	constructor() {
		this.memcached = memjs.Client.create(process.env.MEMCACHED_URL || '127.0.0.1:11211', {
			timeout: 300,
			retries: 0
		});
	}

	public async set(key: string, value: any, options?: any): Promise<boolean> {
		if (await this.test()) {
			return await this.memcached.set(key, value, options);
		}
		return false;
	}

	public async get(key: string): Promise<string | null | boolean> {
		if (await this.test()) {
			const result = await this.memcached.get(key);
			if (result && result.value) {
				return result.value.toString();
			}
			return null;
		}
		return false;
	}

	public async delete(key: string): Promise<boolean> {
		if (await this.test()) {
			return this.memcached.delete(key);
		}
		return false;
	}

	private async test() {
		try {
			await this.memcached.get('test');
			return true;
		} catch (error) {
			return false;
		}
	}
}

export default new Memcached();
