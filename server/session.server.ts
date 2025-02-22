import jwt, { type JwtPayload } from 'jsonwebtoken';
import { merge, set } from 'lodash-es';
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
	expiresIn: string;
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

	config(config: { cookies?: any, cookieName?: string, secret?: string, expiresIn?: string, path?: string, httpOnly?: boolean, secure?: boolean, maxAge?: number }): void {
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
	async setToken(data: any, options: { cookieName?: string, expiresIn?: string, path?: string, httpOnly?: boolean, secure?: boolean, maxAge?: number } = {}): Promise<boolean> {
		this.checkConfig();
		delete data?.exp;
		delete data?.iat;
		const token = jwt.sign(data, this.sm.secret, { expiresIn: options?.expiresIn || this.sm.expiresIn });
		this.sm.cookies?.set(options?.cookieName || this.sm.cookieName, token, {
			path: options?.path || this.sm.path,
			httpOnly: options?.httpOnly || this.sm.httpOnly,
			secure: options?.secure || this.sm.secure,
			maxAge: options?.maxAge || this.sm.maxAge
		});
		return true;
	}

	/**
	 * @method getToken
	 * @param [cookieName] - The name of the cookie.
	 * @param [callback] - The callback function to be called if the token is expired which returns true if the token should be refreshed
	 * @returns A promise that resolves to an object containing the payload, expired status, and error.
	 */
	async getToken(cookieName?: string, callback?: (payload: any) => Promise<boolean>): Promise<PayloadInterface> {
		// Check if the token is cached, return the cached payload
		const cachedPayload = cache.get(cookieName || this.sm.cookieName)
		if (cachedPayload) return this.returnPayload(cachedPayload, false, null);

		this.checkConfig();
		const cookie = this.sm.cookies?.get(cookieName || this.sm.cookieName);
		if (!cookie) return this.returnPayload(null, false, 'Cookie not found');
		try {
			const payload = jwt.verify(cookie, this.sm.secret);
			const remainingTime = (payload as JwtPayload).exp! * 1000 - Date.now();
			cache.set(cookieName || this.sm.cookieName, payload, remainingTime);
			return this.returnPayload(payload, false, null);
		} catch (error) {
			cache.remove(cookieName || this.sm.cookieName);
			if (error instanceof jwt.TokenExpiredError) {
				let payload = jwt.decode(cookie) as JwtPayload;
				if (callback) {
					try {
						if (await callback(payload)) {
							await this.setToken(payload);
							return this.returnPayload(payload, false, null);
						}
					} catch (error) {
					}
				}
				return this.returnPayload(payload, true, null);
			}
			return this.returnPayload(null, false, error instanceof Error ? error.message : 'Unknown error');
		}
	}

	async updateToken(newPayload: any): Promise<PayloadInterface> {
		const { payload } = await this.getToken();
		const mergedPayload = merge(payload, newPayload);
		await this.setToken(mergedPayload);
		return this.returnPayload(mergedPayload, false, null);
	}

	async clearToken(): Promise<boolean> {
		this.checkConfig();
		await this.setToken({});
		return true;
	}

	async deleteToken(cookieName?: string, cookiePath?: string): Promise<boolean> {
		this.checkConfig();
		this.sm.cookies?.delete(cookieName || this.sm.cookieName, { path: cookiePath || this.sm.path });
		return true;
	}

	private returnPayload(payload: any, expired: boolean = false, error: Error | null | string = null): { payload: any, expired: boolean, error: Error | null | string, exp: number, iat: number } {
		const exp = payload?.exp;
		const iat = payload?.iat;
		delete payload?.exp;
		delete payload?.iat;
		return { payload, expired, error, exp, iat };
	}
}
export const session = new Session;
export default session;
