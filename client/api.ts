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

	private request = async <T>(
		url: string,
		method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
		payload: any = null
	): Promise<{ result: T | null; error: any }> => {
		const options: RequestInit = {
			method: method,
			headers: {
				'Content-Type': 'application/json',
			},
			body: payload ? JSON.stringify(payload) : null,
		};

		try {
			const result = await fetch(`${globalApiBaseUrl}${url}`, options);
			if (result.ok) {
				return { result: await result.json(), error: null };
			}
			const message = await result.json();
			return { result: null, error: { status: result.status, statusText: result.statusText, message: message } };
		} catch (err: unknown) {
			return {
				result: null,
				error: err instanceof Error ? { name: err.name, code: err.code, cause: err.cause, message: err.message } : 'Bilinmeyen hata',
			};
		}
	};

	public get = async <T>(url: string): Promise<{ result: T | null; error: any }> => {
		return this.request<T>(url, 'GET');
	};

	public post = async <T>(url: string, payload: any): Promise<{ result: T | null; error: any }> => {
		return this.request<T>(url, 'POST', payload);
	};

	public put = async <T>(url: string, payload: any): Promise<{ result: T | null; error: any }> => {
		return this.request<T>(url, 'PUT', payload);
	};

	public delete = async <T>(url: string): Promise<{ result: T | null; error: any }> => {
		return this.request<T>(url, 'DELETE');
	};

	public patch = async <T>(url: string, payload: any): Promise<{ result: T | null; error: any }> => {
		return this.request<T>(url, 'PATCH', payload);
	};
}

export default new Api();
