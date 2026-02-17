import jwt, { type JwtPayload, type Secret, type SignOptions } from 'jsonwebtoken';
import { AsyncLocalStorage } from 'node:async_hooks';

// #region Interfaces

interface Cookies {
	set: (name: string, value: string, options: CookiesOptions) => void,
	get: (name: string) => string | null,
	delete: (name: string, options?: { path?: string }) => void
}

interface CookiesOptions {
	path: string,
	httpOnly: boolean,
	secure: boolean,
	maxAge: number
}

interface SessionConfig {
	cookies?: Cookies | null;
	cookieName: string;
	secret: string;
	expiresIn: string | number;
	path: string;
	httpOnly: boolean;
	secure: boolean;
	maxAge: number;
}

export interface PayloadInterface<T = any> {
	payload: T;
	expired: boolean;
	error: string | null;
	exp: number;
	iat: number;
}

type SessionOptions = Partial<Omit<SessionConfig, 'cookies'>>;

// #endregion Interfaces

const storage = new AsyncLocalStorage<SessionConfig>();
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function stripJwtFields(payload: any): any {
	if (!payload || typeof payload !== 'object') return payload;
	const { exp, iat, ...rest } = payload;
	return rest;
}

export class Session {
	private _sm: SessionConfig = {
		cookies: null,
		cookieName: 'session_cookie',
		secret: process.env.JWT_SECRET || 'secret',
		expiresIn: '15m',
		path: '/',
		httpOnly: true,
		secure: true,
		maxAge: 365 * 24 * 60 * 60 * 1000
	};

	private get sm(): SessionConfig {
		return storage.getStore() || this._sm;
	}

	private set sm(value: SessionConfig) {
		const store = storage.getStore();
		if (store) {
			Object.assign(store, value);
		} else {
			this._sm = value;
		}
	}

	constructor() { }

	init(options?: SessionOptions) {
		return async ({ event, resolve }: any) => {
			return await storage.run({ ...this.sm, ...options, cookies: event.cookies }, () => resolve(event));
		};
	}

	run<T>(config: { cookies?: any } & SessionOptions, callback: () => T): T {
		return storage.run({ ...this.sm, ...config }, callback);
	}

	private checkConfig() {
		if (!this.sm.cookies) throw new Error('Invalid session config');
	}

	setToken(data: any, options: { cookieName?: string, expiresIn?: string, path?: string, httpOnly?: boolean, secure?: boolean, maxAge?: number } = {}): PayloadInterface {
		this.checkConfig();
		data = stripJwtFields(data);
		const token = jwt.sign(
			data,
			this.sm.secret as Secret,
			{ expiresIn: options?.expiresIn ?? this.sm.expiresIn } as SignOptions
		);
		this.sm.cookies?.set(options?.cookieName ?? this.sm.cookieName, token, {
			path: options?.path ?? this.sm.path,
			httpOnly: options?.httpOnly ?? this.sm.httpOnly,
			secure: options?.secure ?? this.sm.secure,
			maxAge: options?.maxAge ?? this.sm.maxAge
		});

		const decoded = jwt.decode(token) as JwtPayload;
		return this.returnPayload({ ...data, exp: decoded.exp, iat: decoded.iat }, false, null);
	}

	async getToken<T = any>(cookieName?: string, callback?: ((payload: any) => Promise<PayloadInterface | boolean>) | boolean): Promise<PayloadInterface<T>> {
		this.checkConfig();
		const resolvedCookieName = cookieName || this.sm.cookieName;
		const cookie = this.sm.cookies?.get(resolvedCookieName);
		if (!cookie) return this.returnPayload(null, false, 'Cookie not found');
		try {
			const payload = jwt.verify(cookie, this.sm.secret);
			return this.returnPayload(payload, false, null);
		} catch (error) {
			if (error instanceof jwt.TokenExpiredError) {
				let payload = jwt.decode(cookie) as JwtPayload;
				if (!payload) {
					return this.returnPayload(null, true, 'Token is invalid');
				}

				if (callback) {
					try {
						if (typeof callback === 'function') {
							let newPayload = await callback(payload);
							if (!newPayload) {
								return this.returnPayload(payload, true, null);
							}

							if (newPayload === true) {
								return this.setToken(stripJwtFields(payload));
							}

							const payloadData = typeof newPayload === 'object' && 'payload' in newPayload ? newPayload.payload : newPayload;
							return this.setToken(payloadData);
						} else {
							if (callback === true) {
								return this.setToken(stripJwtFields(payload));
							}
							return this.returnPayload(payload, true, null);
						}
					} catch (error) {
						return this.returnPayload(payload, true, error instanceof Error ? error.message : 'Unknown error');
					}
				}
				return this.returnPayload(payload, true, null);
			}
			return this.returnPayload(null, false, error instanceof Error ? error.message : 'Unknown error');
		}
	}

	async updateToken(newPayload: any): Promise<PayloadInterface> {
		const tokenResult = await this.getToken();
		if (tokenResult.error || !tokenResult.payload) {
			return tokenResult;
		}
		const mergedPayload = mergeDeep(tokenResult.payload, newPayload);
		return this.setToken(mergedPayload);
	}

	clearToken(cookieName?: string, cookiePath?: string): PayloadInterface {
		this.checkConfig();
		return this.setToken({}, { cookieName: cookieName ?? this.sm.cookieName, path: cookiePath ?? this.sm.path });
	}

	deleteToken(cookieName?: string, cookiePath?: string): boolean {
		this.checkConfig();
		this.sm.cookies?.delete(cookieName ?? this.sm.cookieName, { path: cookiePath ?? this.sm.path });
		return true;
	}

	private returnPayload<T = any>(payload: any, expired: boolean = false, error: string | null = null): PayloadInterface<T> {
		const exp = payload?.exp;
		const iat = payload?.iat;
		const payloadCopy = stripJwtFields(payload);
		return { payload: payloadCopy, expired, error, exp, iat };
	}
}
export const session = new Session;
export default session;

function mergeDeep(target: any, source: any): any {
	if (!target) return { ...source };
	if (!source) return { ...target };
	const output = { ...target };
	for (const key of Object.keys(source)) {
		if (UNSAFE_KEYS.has(key)) continue;
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
