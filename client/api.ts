/**
 * API class to fetch data from the server
 * @lastModified 23.11.2024
 *
 * @constructor
 * @param baseUrl - The base URL of the server
 *
 * @method fetch
 * @param url - The URL to fetch data from
 * @returns {result:T|null,error:string|null} - The result of the fetch operation
 */

let base = ''
let globalApiBaseUrl: string = base;

class Api {
	private baseUrl: string;
	constructor(baseUrl: string = '') {
		this.baseUrl = baseUrl;
	}

	public setBaseUrl = (url: string) => {
		globalApiBaseUrl = url;
	};

	public fetch = async <T>(url: string, payload: any = ''): Promise<{ result: T | null; error: any }> => {
		const query = typeof payload === 'string' ? '?' + payload : '';
		console.log(`URL: ${globalApiBaseUrl}${url}${query}`);
		console.log(typeof payload === 'object' ? 'POST' : 'GET');
		try {
			const result = await fetch(`${globalApiBaseUrl}${url}${query}`, {
				method: typeof payload === 'object' ? 'POST' : 'GET',
				body: typeof payload === 'object' ? JSON.stringify(payload) : null,
			});
			if (result.ok) {
				return { result: await result.json(), error: null };
			}
			return { result: null, error: { status: result.status, statusText: result.statusText } };
		} catch (err: unknown) {
			return { result: null, error: err instanceof Error ? { error: { name: err.name, message: err.message } } : 'Unknown error' };
		}
	};
}

export default new Api();
