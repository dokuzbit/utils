import { expect, test, describe } from "bun:test";
import session from "../../server/session.server";

class MockCookies {
    constructor(id, token) {
        this.id = id;
        this.token = token;
    }
    set(name, value) { this.token = value; }
    get(name) { 
        console.log(`MockCookies[${this.id}].get called`);
        return this.token; 
    }
    delete(name) { this.token = null; }
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

test("session.config inside session.run stays scoped", async () => {
    const cookiesA = new MockCookies("A", "tokenA");
    const cookiesB = new MockCookies("B", "tokenB");

    const promiseA = session.run({ cookies: cookiesA }, async () => {
        await Bun.sleep(50);
        session.config({ cookieName: "cookieA" });
        await Bun.sleep(100);
        // This should still use cookieA even if B changed it
        return await session.getToken("cookieA");
    });

    const promiseB = session.run({ cookies: cookiesB }, async () => {
        await Bun.sleep(100);
        session.config({ cookieName: "cookieB" });
        return await session.getToken("cookieB");
    });

    await Promise.all([promiseA, promiseB]);
});
