import { expect, test, describe } from "bun:test";
import session from "../../server/session.server";

class MockCookies {
    id: string;
    token: string | null;
    constructor(id: string, token: string | null) {
        this.id = id;
        this.token = token;
    }
    set(name: string, value: string) { this.token = value; }
    get(name: string) {
        console.log(`MockCookies[${this.id}].get called`);
        return this.token;
    }
    delete(name: string) { this.token = null; }
}

test("session.run fixes concurrency race condition", async () => {
    const cookiesA = new MockCookies("A", "tokenA");
    const cookiesB = new MockCookies("B", "tokenB");

    const promiseA = session.run({ cookies: cookiesA }, async () => {
        await Bun.sleep(100);
        return await session.getToken();
    });

    const promiseB = session.run({ cookies: cookiesB }, async () => {
        return await session.getToken();
    });

    await Promise.all([promiseA, promiseB]);
});

test("session.run contexts are fully isolated", async () => {
    const cookiesA = new MockCookies("A", "tokenA");
    const cookiesB = new MockCookies("B", "tokenB");

    const promiseA = session.run({ cookies: cookiesA, cookieName: "cookieA" }, async () => {
        await Bun.sleep(50);
        await Bun.sleep(100);
        return await session.getToken("cookieA");
    });

    const promiseB = session.run({ cookies: cookiesB, cookieName: "cookieB" }, async () => {
        await Bun.sleep(100);
        return await session.getToken("cookieB");
    });

    await Promise.all([promiseA, promiseB]);
});
