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

import { SqlError } from "mariadb";

let base = ''
let globalApiBaseUrl: string = base;
interface Response<T> {
	data: T | null;
	error?: any;
	status?: number;
	ok?: boolean;
}

export class Api {
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
	): Promise<Response<T>> => {
		const options: RequestInit = {
			method: method,
			headers: {
				'Content-Type': 'application/json',
			},
			body: payload ? JSON.stringify(payload) : null,
		};

		try {
			const result = await fetch(`${globalApiBaseUrl}${url}`, options);
			if (result.ok) return { data: await result.json(), error: null, status: result.status, ok: result.ok };
			const message = await result.json();
			return { data: null, error: message || 'Unknown error', status: result.status, ok: result.ok };
		} catch (err: unknown) {
			return {
				data: null,
				error: err instanceof SqlError ? { name: err.name, code: err.code, cause: err.cause, message: err.message } : 'Unknown error',
				status: 500,
				ok: false,
			};
		}
	};

	public get = async <T>(url: string, payload: any = null): Promise<Response<T>> => {
		return this.request<T>(url, 'GET', payload);
	};

	public post = async <T>(url: string, payload: any): Promise<Response<T>> => {
		return this.request<T>(url, 'POST', payload);
	};

	public put = async <T>(url: string, payload: any): Promise<Response<T>> => {
		return this.request<T>(url, 'PUT', payload);
	};

	public delete = async <T>(url: string): Promise<Response<T>> => {
		return this.request<T>(url, 'DELETE');
	};

	public patch = async <T>(url: string, payload: any): Promise<Response<T>> => {
		return this.request<T>(url, 'PATCH', payload);
	};
}

export const api = new Api();
export default api;
