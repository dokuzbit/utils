import { expect, test } from "bun:test";
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

session.config({ cookies: cookies, cookieName: "test_cookie" });

// TODO: Testlerde hata var ikinci kez set etitğimizde exp ve iat undefined oluyor.

test("session set get", async () => {
  session.setToken({ id: 1, name: "test" });
  const token = await session.getToken("");
  expect(token).toMatchObject({
    payload: { id: 1, name: "test" },
    expired: false,
    error: null,
  });
});

test("session multiple set get", async () => {
  await session.setToken(
    { id: 1, name: "test1" },
    { cookieName: "test_cookie1" }
  );
  await session.setToken(
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

test("session clear token", async () => {
  await session.setToken({ id: 1, name: "test" });
  await session.clearToken();
  const token = await session.getToken();
  expect(token).toMatchObject({ payload: {}, expired: false, error: null });
});

test("session delete token", async () => {
  await session.setToken({ id: 1, name: "test" });
  await session.deleteToken();
  const token = await session.getToken();
  expect(token).toMatchObject({
    payload: null,
    expired: false,
    error: "Cookie not found",
  });
});

test("session get token expired", async () => {
  session.config({ expiresIn: 1 });
  await session.setToken({ id: 1, name: "test" });
  await Bun.sleep(1500);
  const token = await session.getToken();
  expect(token).toMatchObject({
    payload: { id: 1, name: "test" },
    expired: true,
    error: null,
  });
});

test("session get token expired callback false", async () => {
  session.config({ expiresIn: "1s" });
  await session.setToken({ id: 1, name: "test" });
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

test("session get token expired callback true", async () => {
  session.config({ expiresIn: "1s" });
  await session.setToken({ id: 1, name: "test" });
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

test("updateToken", async () => {
  await session.setToken({
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
