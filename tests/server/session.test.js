import { expect, test } from 'bun:test';
import session from '../../server/session.server';

const mockCookies = {
    cookies: {},
    set(cookieName, token, options) {
        this.cookies[cookieName] = { token, options };
        // console.log(`Cookie set: ${cookieName}, Token: ${token}, Options:`, options);
        return true;
    },
    get(cookieName) {
        return this.cookies[cookieName]?.token;
    },
    delete(cookieName) {
        delete this.cookies[cookieName];
        return true;
    }
};


// session.config({
//     cookies: mockCookies,
//     cookieName: 'test_cookie',
//     secret: 'secret',
//     expiresIn: '1m'
// });

session.config({ cookies: mockCookies, cookieName: 'test_cookie' });

test('session set get', async () => {
    session.setToken({ id: 1, name: 'test' });
    const token = await session.getToken('');
    expect(token).toMatchObject({ payload: { id: 1, name: 'test' }, expired: false, error: null });
});

test('session multiple set get', async () => {
    session.setToken({ id: 1, name: 'test1' });
    session.setToken({ id: 2, name: 'test2' },{cookieName: 'test_cookie2'});
    const token = await session.getToken();
    const token2 = await session.getToken('test_cookie2');
    expect(token).toMatchObject({ payload: { id: 1, name: 'test1' }, expired: false, error: null });
    expect(token2).toMatchObject({ payload: { id: 2, name: 'test2' }, expired: false, error: null });
});

test('session clear token', async () => {
    session.setToken({ id: 1, name: 'test' });
    await session.clearToken();
    const token = await session.getToken();
    expect(token).toMatchObject({ payload:{}, expired: false, error: null });
});

test('session delete token', async () => {
    session.setToken({ id: 1, name: 'test' });
    await session.deleteToken();
    const token = await session.getToken();
    expect(token).toMatchObject({ payload: null, expired: false, error: 'Cookie not found' });
});

test('session get token expired', async () => {
    session.config({ expiresIn: '1s' });
    session.setToken({ id: 1, name: 'test' });
    await Bun.sleep(1500);
    const token = await session.getToken('');
    expect(token).toMatchObject({ payload: { id: 1, name: 'test'}, expired: true, error: null});
});

test('session get token expired callback false', async () => {
    session.config({ expiresIn: '1s' });
    session.setToken({ id: 1, name: 'test' });
    await Bun.sleep(1500);
    const token = await session.getToken('', async () => false);
    expect(token).toMatchObject({ payload: { id: 1, name: 'test'}, expired: true, error: null});
});

test('session get token expired callback true', async () => {
    session.config({ expiresIn: '1s' });
    session.setToken({ id: 1, name: 'test' });
    await Bun.sleep(1500);
    const token = await session.getToken('', async () => true);
    expect(token).toMatchObject({ payload: { id: 1, name: 'test'}, expired: false, error: null});
});

test('updateToken', async () => {
    session.setToken({session: {user: {name:'Joe',age:20, id:1}} });
    const token = await session.updateToken({session: {user: {age:21, id:2}} });
    expect(token).toMatchObject({ payload: { session: { user: { name: 'Joe', age: 21, id: 2 } } }, expired: false, error: null});
});

