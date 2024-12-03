import type { Cookies } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import mariaDB from './mariaDB';
const secret = process.env.JWT_SECRET || 'cctv4444';

/**
 * browserUUID yi cookie'den al ve dön
 * yoksa yeni bir browserUUID oluştur ve cookie'ye set et
 * expired ise aynı browserUUID ile yeniden imzalayıp cookie'ye set et
 *
 * @param {RequestCookies} cookies
 * @returns {string} browserUUID
 */
export function getBrowserUUID(cookies: Cookies): string {
	const { payload, expired, error } = getToken(cookies, 'ceperp_session');
	// Eğer cookie varsa ve browserUUID varsa ve jwt expired değilse browserUUID 'yi dön
	if (payload?.browserUUID && !expired) return payload?.browserUUID || '';
	// Eğer jwt expired ise aynı browserUUID'yi değilde cookie yok demektir yeni bir browserUUID oluşturulur
	const browserUUID = payload?.browserUUID && expired ? payload?.browserUUID : crypto.randomUUID();
	setToken(cookies, { browserUUID }, '15m');
	return browserUUID;
}

export async function setSession(cookies: Cookies, session: App.Session): Promise<boolean> {
	if (session.browserUUID && session.user?.id) {
		await mariaDB.upsert(
			'erp_session',
			{
				UUID: session.browserUUID,
				userID: session.user?.id,
				sessionName: '/mobil',
				locked: session.locked
			},
			{
				sessionName: '/mobil'
			}
		);
	}
	setToken(cookies, session);
	return true;
}

export async function getSession(cookies: Cookies): Promise<any> {
	const { payload, expired, error }: { payload: App.Session; expired: boolean; error?: Error } = getToken(cookies);

	// Eğer jwt hatası varsa null dön
	if (error) return null;
	// Eğer browserUUID yoksa yeni bir browserUUID oluştur ve cookie'ye set et ve dön
	if (!payload?.browserUUID) {
		console.log('📂 src/lib/server/session.ts 👉 44 👀  ➤ ilk defa session oluşturuluyor');

		const browserUUID = crypto.randomUUID();
		setToken(cookies, { browserUUID });
		return { browserUUID };
	}
	// Eğer jwt expired ise ve browserUUID ve userID varsa server'daki session'ı kontrol et ve eşleşirse token'ı yeniler
	// INFO: userID yoksa expired olsa bile refresh edilmez (bazı durumlarda bu uygun olmayabilir)
	if (expired && payload.browserUUID && payload.user?.id) {
		// Sunucuda session var mı kontrol et
		const serverSession = await mariaDB.getFirst('UUID,userID,locked', 'erp_session', 'UUID = ? AND userID = ?', [
			payload.browserUUID,
			payload.user.id
		]);
		// Sunucuda session varsa token'ı yenden imzala
		if (serverSession) {
			console.log('📂 src/lib/server/session.ts 👉 61 👀  ➤ session sunucuda var');
			setToken(cookies, payload);
			return payload;
		} else {
			console.log('📂 src/lib/server/session.ts 👉 61 👀  ➤ session sunucudan silinmiş');
			setToken(cookies, { browserUUID: payload.browserUUID });
			return { browserUUID: payload.browserUUID };
		}
	}
	return payload;
}

function getToken(cookies: Cookies, cookieName: string = 'ceperp_session'): { payload: any; expired: boolean; error?: Error } {
	const cookie = cookies.get(cookieName) as string;
	if (!cookie) return { payload: null, expired: false };
	try {
		return { payload: jwt.verify(cookie, secret), expired: false };
	} catch (error) {
		if (error instanceof jwt.TokenExpiredError) {
			return { payload: jwt.decode(cookie), expired: true };
		}
		return { payload: null, expired: false, error: error as Error };
	}
}

function setToken(cookies: Cookies, payload: any, time: string = '2m', cookieName: string = 'ceperp_session'): boolean {
	delete payload.iat;
	delete payload.exp;
	const token = jwt.sign(payload, secret, { expiresIn: time });
	cookies.set(cookieName, token, {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		maxAge: 365 * 24 * 60 * 60 * 1000
	});
	return true;
}
