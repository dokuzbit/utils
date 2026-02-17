import { expect, test, describe } from "bun:test";
import session from "../../server/session.server";

class Cookies {
  constructor() {
    this.cookies = {};
  }
  set(cookieName, token, options) {
    this.cookies[cookieName] = { token, options };
    return true;
  }
  get(cookieName) {
    return this.cookies[cookieName]?.token;
  }
  delete(cookieName) {
    this.cookies[cookieName] = undefined;
    return true;
  }
}

const cookies = new Cookies();

const runWithSession = (fn) =>
  session.run({ cookies, cookieName: "test_cookie", expiresIn: "1s" }, fn);

describe("callback tests", () => {
  test("callback true", async () => {
    await runWithSession(async () => {
      await session.setToken({ id: 1, name: "test" });
      await Bun.sleep(1500);
      const token = await session.getToken("", () => Promise.resolve(true));
      expect(token).toMatchObject({
        payload: { id: 1, name: "test" },
        expired: false,
        error: null,
      });
    });
  });

  test("callback false", async () => {
    await runWithSession(async () => {
      await session.setToken({ id: 1, name: "test" });
      await Bun.sleep(1500);
      const token = await session.getToken("", false);
      expect(token).toMatchObject({
        payload: { id: 1, name: "test" },
        expired: true,
        error: null,
      });
    });
  });

  test("callback none", async () => {
    await runWithSession(async () => {
      await session.setToken({ id: 1, name: "test" });
      await Bun.sleep(1500);
      const token = await session.getToken("");
      expect(token).toMatchObject({
        payload: { id: 1, name: "test" },
        expired: true,
        error: null,
      });
    });
  });
});

test("session set get", async () => {
  await runWithSession(async () => {
    session.setToken({ id: 1, name: "test" });
    const token = await session.getToken("");
    expect(token).toMatchObject({
      payload: { id: 1, name: "test" },
      expired: false,
      error: null,
    });
  });
});

test("session multiple set get", async () => {
  await runWithSession(async () => {
    session.setToken(
      { id: 1, name: "test1" },
      { cookieName: "test_cookie1" }
    );
    session.setToken(
      { id: 2, name: "test2" },
      { cookieName: "test_cookie2" }
    );
    const token = await session.getToken("test_cookie1");
    const token2 = await session.getToken("test_cookie2");
    expect(token).toMatchObject({
      payload: { id: 1, name: "test1" },
      expired: false,
      error: null,
    });
    expect(token2).toMatchObject({
      payload: { id: 2, name: "test2" },
      expired: false,
      error: null,
    });
  });
});

test("session clear token", async () => {
  await runWithSession(async () => {
    session.setToken({ id: 1, name: "test" });
    session.clearToken();
    const token = await session.getToken();
    expect(token).toMatchObject({ payload: {}, expired: false, error: null });
  });
});

test("session delete token", async () => {
  await runWithSession(async () => {
    session.setToken({ id: 1, name: "test" });
    session.deleteToken();
    const token = await session.getToken();
    expect(token).toMatchObject({
      payload: null,
      expired: false,
      error: "Cookie not found",
    });
  });
});

test("session get token expired", async () => {
  await runWithSession(async () => {
    session.setToken({ id: 1, name: "test" });
    await Bun.sleep(1500);
    const token = await session.getToken();
    expect(token).toMatchObject({
      payload: { id: 1, name: "test" },
      expired: true,
      error: null,
    });
  });
});

test("session get token expired callback false", async () => {
  await runWithSession(async () => {
    session.setToken({ id: 1, name: "test" });
    await Bun.sleep(1500);
    const token = await session.getToken("", async () => false);
    expect(token).toMatchObject({
      payload: { id: 1, name: "test" },
      expired: true,
      error: null,
    });
    const token2 = await session.getToken("", false);
    expect(token2).toMatchObject({
      payload: { id: 1, name: "test" },
      expired: true,
      error: null,
    });
  });
});

test("session get token expired callback true", async () => {
  await runWithSession(async () => {
    session.setToken({ id: 1, name: "test" });
    await Bun.sleep(1500);
    const token = await session.getToken("", async () => true);
    expect(token).toMatchObject({
      payload: { id: 1, name: "test" },
      expired: false,
      error: null,
    });
    const token2 = await session.getToken("", true);
    expect(token2).toMatchObject({
      payload: { id: 1, name: "test" },
      expired: false,
      error: null,
    });
  });
});

test("updateToken", async () => {
  await runWithSession(async () => {
    session.setToken({
      session: { user: { name: "Joe", age: 20, id: 1 } },
    });
    const token = await session.updateToken({
      session: { user: { age: 21, id: 2 } },
    });
    expect(token).toMatchObject({
      payload: { session: { user: { name: "Joe", age: 21, id: 2 } } },
      expired: false,
      error: null,
    });
  });
});

test("session set token twice exp and iat should be defined", async () => {
  await runWithSession(async () => {
    const result1 = session.setToken({ id: 1, name: "test" });
    expect(result1.exp).toBeDefined();
    expect(result1.iat).toBeDefined();
    expect(typeof result1.exp).toBe("number");
    expect(typeof result1.iat).toBe("number");

    const result2 = session.setToken({ id: 2, name: "test2" });
    expect(result2.exp).toBeDefined();
    expect(result2.iat).toBeDefined();
    expect(typeof result2.exp).toBe("number");
    expect(typeof result2.iat).toBe("number");

    // İkinci token'ın exp'i ilkinden büyük olmalı (daha yeni)
    expect(result2.exp).toBeGreaterThanOrEqual(result1.exp);
    expect(result2.iat).toBeGreaterThanOrEqual(result1.iat);
  });
});
