import { expect, test } from 'bun:test';
import { acl, ACL } from "../../server/acl.server";

const actions = [
    ["+", "create"],
    ["?", "read"],
    ["*", "update"],
    ["-", "delete"]
];

const attributes = [
    ["o", "own"],
    ["n", "new"],
];

const permissions = [
    ["*", "*"],
    ["usr", "userlist"],
    ["inv", "invoice"],
];

const roles = [
    { name: "superAdmin", permissions: ["*"] },
    { name: "admin", permissions: ["usr%", "inv%"] },
    { name: "accounting", permissions: ["inv?", "inv+", "inv*o", "inv-n"], },
    { name: "user", permissions: ["usr?", "usr*o", "usr-on"], },
];

const users = [
    { id: "superAdmin", roles: ["superAdmin"] },
    { id: "admin", roles: ["admin"] },
    { id: "accounting", roles: ["user", "accounting"] },
    { id: "accountingAdmin", roles: ["accounting"], permissions: ["inv%", "!inv-"] },
    { id: "user", roles: ["user"] },
    { id: "userAdmin", roles: ["user"], permissions: ["usr+", "usr-o"] },
];


test("SuperAdmin tüm izinlere sahip olmalı", () => {
    const myACL = new ACL(actions, attributes, permissions);
    const superAdmin = users[0];
    const userPermissions = myACL.getPermissions(superAdmin, roles);

    expect(myACL.checkPermission(userPermissions, "invoice:delete")).toBe(true);
    expect(myACL.checkPermission(userPermissions, "userlist:create:own")).toBe(true);
    expect(myACL.checkPermission(userPermissions, "unknown:read")).toBe(false);
});

test("Admin rolündeki kullanıcı userlist ve invoice işlemlerine erişebilmeli", () => {
    const myACL = new ACL(actions, attributes, permissions);
    const admin = users[1];
    const userPermissions = myACL.getPermissions(admin, roles);

    expect(myACL.checkPermission(userPermissions, "userlist:read")).toBe(true);
    expect(myACL.checkPermission(userPermissions, "userlist:update:own")).toBe(true);
    expect(myACL.checkPermission(userPermissions, "invoice:delete:new")).toBe(true);
    expect(myACL.checkPermission(userPermissions, "invoice:create")).toBe(true);

    expect(myACL.checkPermission(userPermissions, "unknown:read")).toBe(false);
});

test("Accounting ve user rollerinin birleşimindeki kullanıcı için izin kontrolleri", () => {
    const myACL = new ACL(actions, attributes, permissions);
    const accounting = users[2];
    const userPermissions = myACL.getPermissions(accounting, roles);

    expect(myACL.checkPermission(userPermissions, "userlist:update:own")).toBe(true);
    expect(myACL.checkPermission(userPermissions, "userlist:delete:own:new")).toBe(true);

    expect(myACL.checkPermission(userPermissions, "invoice:read")).toBe(true);
    expect(myACL.checkPermission(userPermissions, "invoice:create")).toBe(true);
    expect(myACL.checkPermission(userPermissions, "invoice:update:own")).toBe(true);
    expect(myACL.checkPermission(userPermissions, "invoice:delete:new")).toBe(true);
    expect(myACL.checkPermission(userPermissions, "invoice:delete")).toBe(false);
});

test("AccountingAdmin negatif izin işlemiyle kısıtlanmalı", () => {
    const myACL = new ACL(actions, attributes, permissions);
    const accountingAdmin = users[3];
    const userPermissions = myACL.getPermissions(accountingAdmin, roles);

    expect(myACL.checkPermission(userPermissions, "invoice:delete")).toBe(false);
    expect(myACL.checkPermission(userPermissions, "invoice:read")).toBe(true);
    expect(myACL.checkPermission(userPermissions, "invoice:delete:new")).toBe(false);
});

test("Sadece user rolüne sahip kullanıcı için testler", () => {
    const myACL = new ACL(actions, attributes, permissions);
    const user = users[4];
    const userPermissions = myACL.getPermissions(user, roles);

    expect(myACL.checkPermission(userPermissions, "userlist:read")).toBe(true);
    expect(myACL.checkPermission(userPermissions, "userlist:update:own")).toBe(true);
    expect(myACL.checkPermission(userPermissions, "userlist:delete:own:new")).toBe(true);
    expect(myACL.checkPermission(userPermissions, "userlist:delete:new")).toBe(false);
});

test("UserAdmin direkt izinleri eklenmiş kullanıcı", () => {
    const myACL = new ACL(actions, attributes, permissions);
    const userAdmin = users[5];
    const userPermissions = myACL.getPermissions(userAdmin, roles);

    expect(myACL.checkPermission(userPermissions, "userlist:create")).toBe(true);
    expect(myACL.checkPermission(userPermissions, "userlist:read:own")).toBe(true);
    expect(myACL.checkPermission(userPermissions, "userlist:delete:own:new")).toBe(true);
});
