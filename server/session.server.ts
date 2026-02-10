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

interface PayloadInterface {
	payload: any;
	expired: boolean;
	error: Error | null | string;
	exp: number;
	iat: number;
}

// #endregion Interfaces

const storage = new AsyncLocalStorage<SessionConfig>();

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

	config(config: { cookies?: any, cookieName?: string, secret?: string, expiresIn?: string | number, path?: string, httpOnly?: boolean, secure?: boolean, maxAge?: number }): Session {
		this.sm = { ...this.sm, ...config };
		return this;
	}

	run<T>(config: { cookies?: any, cookieName?: string, secret?: string, expiresIn?: string | number, path?: string, httpOnly?: boolean, secure?: boolean, maxAge?: number }, callback: () => T): T {
		return storage.run({ ...this.sm, ...config }, callback);
	}

	handle(options?: Partial<SessionConfig>) {
		return async ({ event, resolve }: any) => {
			return await storage.run({ ...this.sm, ...options, cookies: event.cookies }, () => resolve(event));
		};
	}

	checkConfig() {
		if (!this.sm.cookies) throw new Error('Invalid session config');
	}

	async setToken(data: any, options: { cookieName?: string, expiresIn?: string, path?: string, httpOnly?: boolean, secure?: boolean, maxAge?: number } = {}): Promise<PayloadInterface> {
		this.checkConfig();
		delete data?.exp;
		delete data?.iat;
		const token = jwt.sign(
			data,
			this.sm.secret as Secret,
			{ expiresIn: options?.expiresIn || this.sm.expiresIn } as SignOptions
		);
		this.sm.cookies?.set(options?.cookieName || this.sm.cookieName, token, {
			path: options?.path || this.sm.path,
			httpOnly: options?.httpOnly || this.sm.httpOnly,
			secure: options?.secure || this.sm.secure,
			maxAge: options?.maxAge || this.sm.maxAge
		});

		const decoded = jwt.decode(token) as JwtPayload;
		return this.returnPayload({ ...data, exp: decoded.exp, iat: decoded.iat }, false, null);
	}

	async getToken(cookieName?: string, callback?: ((payload: any) => Promise<PayloadInterface | boolean>) | boolean): Promise<PayloadInterface> {
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
								const payloadWithoutExpIat = { ...payload };
								delete payloadWithoutExpIat.exp;
								delete payloadWithoutExpIat.iat;
								return await this.setToken(payloadWithoutExpIat);
							}

							const payloadData = typeof newPayload === 'object' && 'payload' in newPayload ? newPayload.payload : newPayload;
							return await this.setToken(payloadData);
						} else {
							if (callback === true) {
								return await this.setToken(payload);
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
		const mergedPayload = mergeDeep(tokenResult.payload, newPayload);
		return await this.setToken(mergedPayload);
	}

	async clearToken(cookieName?: string, cookiePath?: string): Promise<boolean> {
		this.checkConfig();
		await this.setToken({}, { cookieName: cookieName || this.sm.cookieName, path: cookiePath || this.sm.path });
		return true;
	}

	async deleteToken(cookieName?: string, cookiePath?: string): Promise<boolean> {
		this.checkConfig();
		this.sm.cookies?.delete(cookieName || this.sm.cookieName, { path: cookiePath || this.sm.path });
		return true;
	}

	private returnPayload(payload: any, expired: boolean = false, error: Error | null | string = null): PayloadInterface {
		const exp = payload?.exp;
		const iat = payload?.iat;
		const payloadCopy = payload ? { ...payload } : payload;
		if (payloadCopy && typeof payloadCopy === 'object') {
			delete payloadCopy.exp;
			delete payloadCopy.iat;
		}
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
