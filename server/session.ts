import jwt, { type JwtPayload } from 'jsonwebtoken';

type SessionConfig = {
	cookies: any,
	cookieName: string,
	secret: string,
	expiresIn: string,
	path: string,
	httpOnly: boolean,
	secure: boolean,
	maxAge: number
}

class SessionManager {
	private sm: SessionConfig

	constructor() {
		this.sm = {
			cookies: null,
			cookieName: 'session_cookie',
			secret: process.env.JWT_SECRET || 'secret',
			expiresIn: '15m',
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			maxAge: 365 * 24 * 60 * 60 * 1000
		}
	}

	config(config: { cookies?: any, cookieName?: string, secret?: string, expiresIn?: string, path?: string, httpOnly?: boolean, secure?: boolean, maxAge?: number }): void {
		this.sm = { ...this.sm, ...config };
	}

	checkConfig() {
		if (!this.sm.cookies || !this.sm.cookieName || !this.sm.secret) throw new Error('Invalid session config');
	}

	async setToken(data: any, options?: { cookieName?: string, expiresIn?: string, path?: string, httpOnly?: boolean, secure?: boolean, maxAge?: number }): Promise<boolean> {
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

	async getToken(cookieName?: string, callback?: () => Promise<boolean>): Promise<{ payload: any, expired: boolean, error: Error | null | string }> {
		this.checkConfig();
		const cookie = this.sm.cookies?.get(cookieName || this.sm.cookieName);
		if (!cookie) return this.returnPayload(null, false, 'Cookie not found');
		try {
			const payload = jwt.verify(cookie, this.sm.secret);
			return this.returnPayload(payload, false, null);
		} catch (error) {
			// Eğer jwt expired ise callback çağrılır, callback true dönerse token yenilenir
			if (error instanceof jwt.TokenExpiredError) {
				console.log('📂 src/lib/server/session.ts 👉 60 👀  ➤ jwt expired');
				let payload = jwt.decode(cookie) as JwtPayload;
				if (callback) {
					if (await callback()) {
						await this.setToken(payload);
						return this.returnPayload(payload, false, null);
					} else {
						return this.returnPayload(payload, true, null);
					}
				} else {
					return this.returnPayload(payload, true, null);
				}
			}
			return this.returnPayload(null, false, error.message);
			;
		}
	}

	async updateToken(newPayload: any): Promise<{ payload: any, expired: boolean, error: Error | null }> {
		this.checkConfig();
		const { payload } = await this.getToken();
		if (!payload) return this.returnPayload(null, false, 'Cookie not found');
		delete payload.exp;
		delete payload.iat;
		const mergedPayload = { ...payload, ...newPayload };
		await this.setToken(mergedPayload);
		return this.returnPayload(mergedPayload, false, null);
	}

	async clearToken(): Promise<boolean> {
		this.checkConfig();
		await this.setToken({});
		return true;
	}

	async deleteToken(cookieName?: string): Promise<boolean> {
		this.checkConfig();
		this.sm.cookies?.delete(cookieName || this.sm.cookieName);
		return true;
	}

	private returnPayload(payload: any, expired: boolean = false, error: Error | null | string = null): any {
		let returnPayload = { payload, expired, error, exp: payload?.exp, iat: payload?.iat };
		delete returnPayload?.payload?.exp;
		delete returnPayload?.payload?.iat;
		return returnPayload;
	}
}

export default new SessionManager();