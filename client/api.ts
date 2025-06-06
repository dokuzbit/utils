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

import { cache } from './cache';

type Payload = | string | number | boolean | null | Record<string, unknown> | Payload[] | FormData | Blob | ArrayBuffer;

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
	private headers: Record<string, string>;

	constructor(baseUrl: string = '') {
		this.baseUrl = baseUrl;
		this.headers = {
			'Content-Type': 'application/json',
		};
	}

	public setBaseUrl = (url: string) => {
		globalApiBaseUrl = url;
	};

	public setHeader = (key: string, value: string) => {
		this.headers[key] = value;
	};

	public removeHeader = (key: string) => {
		delete this.headers[key];
	};

	public setHeaders = (headers: Record<string, string>) => {
		this.headers = { ...this.headers, ...headers };
	};

	private request = async <T>(
		url: string,
		method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
		payload: Payload = null
	): Promise<Response<T>> => {
		const options: RequestInit = {
			method: method,
			headers: this.headers,
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
				error: err instanceof Error ? { name: err.name, message: err.message, cause: err?.cause } : 'Unknown error',
				status: 500,
				ok: false,
			};
		}
	};

	public get = async <T>(url: string, payload: string | Record<string, string | number> | undefined = undefined, ttl: number = 300): Promise<Response<T>> => {
		// if payload is an object, make new payload with all number values converted to strings
		let convertedPayload: Record<string, string> | string | undefined = undefined;
		if (payload && typeof payload === 'object') convertedPayload = Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, value.toString()]));
		if (payload && typeof payload === 'string') convertedPayload = payload;

		// if payload exists, add it to the url as query params
		if (convertedPayload) url = `${url}?${new URLSearchParams(convertedPayload).toString()}`;
		// if (payload && typeof payload === 'string') url = `${url}&${payload}`;

		if (ttl > 0) {
			const cached = await cache.get(url);
			if (cached) return { data: cached, error: null, status: 200, ok: true };
		}
		const result = await this.request<T>(url, 'GET');
		if (ttl > 0 && result.data) cache.set(url, result.data, ttl);
		return result;
	};

	public get0 = async <T>(url: string, payload: string | Record<string, string | number> | undefined = undefined): Promise<Response<T>> => {
		return this.get(url, payload, 0);
	};

	public post = async <T>(url: string, payload: Payload): Promise<Response<T>> => {
		return this.request<T>(url, 'POST', payload);
	};

	public put = async <T>(url: string, payload: Payload): Promise<Response<T>> => {
		return this.request<T>(url, 'PUT', payload);
	};

	public delete = async <T>(url: string): Promise<Response<T>> => {
		return this.request<T>(url, 'DELETE');
	};

	public patch = async <T>(url: string, payload: Payload): Promise<Response<T>> => {
		return this.request<T>(url, 'PATCH', payload);
	};
}

export const api = new Api();
export default api;
