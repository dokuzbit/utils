import jwt, { type JwtPayload, type Secret, type SignOptions } from 'jsonwebtoken';
import { cache } from './cache.server';

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

export class Session {
	private sm: SessionConfig = {
		cookies: null,
		cookieName: 'session_cookie',
		secret: process.env.JWT_SECRET || 'secret',
		expiresIn: process.env.NODE_ENV === 'debug' ? '1m' : '15m',
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		maxAge: 365 * 24 * 60 * 60 * 1000
	};

	constructor() { }

	config(config: { cookies?: any, cookieName?: string, secret?: string, expiresIn?: string | number, path?: string, httpOnly?: boolean, secure?: boolean, maxAge?: number }): void {
		this.sm = { ...this.sm, ...config };
	}

	checkConfig() {
		if (!this.sm.cookies) throw new Error('Invalid session config');
	}

	/**
	 * @method setToken
	 * @param data - The data to be encoded into the token.
	 * @param options - The options for the token.
	 * @param options.cookieName - The name of the cookie.
	 * @param options.expiresIn - The expiration time of the token.
	 * @param options.path - The path of the cookie.
	 * @param options.httpOnly - Whether the cookie is HTTP only.
	 * @param options.secure - Whether the cookie is secure.
	 * @param options.maxAge - The maximum age of the cookie.
	 * @returns A promise that resolves to a boolean indicating the success of the operation.
	 */
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

		// ESKİ KOD (HATALI):
		// const newToken = await this.getToken(...);  ← cookies.get() eski cookie döndürüyor!

		// YENİ KOD (DOĞRU):
		// Yeni token'ı direkt decode et, cookie'den okuma
		const decoded = jwt.decode(token) as JwtPayload;
		const remainingTime = decoded.exp! - Date.now() / 1000;
		cache.set(options?.cookieName || this.sm.cookieName, data, remainingTime);
		return this.returnPayload({ ...data, exp: decoded.exp, iat: decoded.iat }, false, null);
	}

	/**
	 * @method getToken
	 * @param [cookieName] - The name of the cookie.
	 * @param [callback] - The callback function to be called if the token is expired which returns true if the token should be refreshed
	 * @returns A promise that resolves to an object containing the payload, expired status, and error.
	 */
	async getToken(cookieName?: string, callback?: ((payload: any) => Promise<PayloadInterface | boolean>) | boolean, nocache = false): Promise<PayloadInterface> {
		// Check if the token is cached, return the cached payload
		// const cachedPayload = cache.get(cookieName || this.sm.cookieName)
		// if (cachedPayload && !nocache) return this.returnPayload(cachedPayload, false, null);
		this.checkConfig();
		const cookie = this.sm.cookies?.get(cookieName || this.sm.cookieName);
		if (!cookie) return this.returnPayload(null, false, 'Cookie not found');
		try {
			const payload = jwt.verify(cookie, this.sm.secret);
			const remainingTime = (payload as JwtPayload).exp! - Date.now() / 1000;
			cache.set(cookieName || this.sm.cookieName, payload, remainingTime);
			return this.returnPayload(payload, false, null);
		} catch (error) {
			if (error instanceof jwt.TokenExpiredError) {
				let payload = jwt.decode(cookie) as JwtPayload;
				if (callback) {
					try {
						if (typeof callback === 'function') {
							let newPayload = await callback(payload);
							// if newPayload is false null or undefined return expired true
							if (!newPayload) {
								cache.remove(cookieName || this.sm.cookieName);
								return this.returnPayload(payload, true, null);
							}

							// if newPayload is true set it to the original payload
							if (newPayload === true) {
								// exp ve iat'i silmeden payload'ı setToken'a gönder
								const payloadWithoutExpIat = { ...payload };
								delete payloadWithoutExpIat.exp;
								delete payloadWithoutExpIat.iat;
								// setToken zaten doğru exp ve iat ile PayloadInterface döndürüyor
								return await this.setToken(payloadWithoutExpIat);
							}

							// PayloadInterface döndüğünde payload property'sini al
							const payloadData = typeof newPayload === 'object' && 'payload' in newPayload ? newPayload.payload : newPayload;
							// setToken zaten doğru exp ve iat ile PayloadInterface döndürüyor
							return await this.setToken(payloadData);
						} else {
							if (callback === true) {
								// if callback is true always refresh the token
								// exp ve iat'i silmeden payload'ı setToken'a gönder
								const payloadWithoutExpIat = { ...payload };
								delete payloadWithoutExpIat.exp;
								delete payloadWithoutExpIat.iat;
								// setToken zaten doğru exp ve iat ile PayloadInterface döndürüyor
								return await this.setToken(payloadWithoutExpIat);
							}
							// if callback is not a function and not true return expired true
							cache.remove(cookieName || this.sm.cookieName);
							return this.returnPayload(payload, true, null);
						}
					} catch (error) {
						cache.remove(cookieName || this.sm.cookieName);
					}
				}
				// if callback is not set return expired true
				cache.remove(cookieName || this.sm.cookieName);
				return this.returnPayload(payload, true, null);
			}
			// For non-expiration errors, remove cache immediately
			cache.remove(cookieName || this.sm.cookieName);
			return this.returnPayload(null, false, error instanceof Error ? error.message : 'Unknown error');
		}
	}

	async updateToken(newPayload: any): Promise<PayloadInterface> {
		const tokenResult = await this.getToken();
		const mergedPayload = mergeDeep(tokenResult.payload, newPayload);
		const result = await this.setToken(mergedPayload);
		// setToken zaten cache'i güncelliyor ve doğru exp/iat ile payload döndürüyor
		return result;
	}

	async clearToken(cookieName?: string, cookiePath?: string): Promise<boolean> {
		this.checkConfig();
		await this.setToken({}, { cookieName: cookieName || this.sm.cookieName, path: cookiePath || this.sm.path });
		cache.remove(cookieName || this.sm.cookieName);
		return true;
	}

	async deleteToken(cookieName?: string, cookiePath?: string): Promise<boolean> {
		this.checkConfig();
		this.sm.cookies?.delete(cookieName || this.sm.cookieName, { path: cookiePath || this.sm.path });
		cache.remove(cookieName || this.sm.cookieName);
		return true;
	}

	private returnPayload(payload: any, expired: boolean = false, error: Error | null | string = null): { payload: any, expired: boolean, error: Error | null | string, exp: number, iat: number } {
		const exp = payload?.exp;
		const iat = payload?.iat;
		// Payload'ı mutate etmemek için kopyasını al ve exp/iat'i kopyadan sil
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