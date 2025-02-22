import { expect, test } from "bun:test";
import { acl } from "../../server/acl.server";
import { mariadb } from "../../server/mariadb.server";

mariadb.config({
    host: "localhost",
    user: "root",
    password: "root",
    database: "erp",
});

const user =
{
    roles: ["pazarlama", "muhasebe", "finans", "admin"],
    rules: ["maliyet:read", "can", "genel:*"],
}




const roles = [
    {
        role: "pazarlama",
        rules: ["pazarlama:read", "pazarlama:update:own"],
    },
    {
        role: "muhasebe",
        rules: ["muhasebe:read", "muhasebe:update:own:new"],
    },
    {
        role: "finans",
        rules: ["finans:read", "finans:update:own"],
    },
    {
        role: "admin",
        rules: ["muhasebe:delete", "satis:onay"],
    },
];

test("Can rolünün izinleri doğru mu?", () => {
    const userPermissions = acl.buildShortList(user, roles);
    console.log(acl.checkPermission(userPermissions, "finans:xxx"));
    expect(acl.checkPermission(userPermissions, "can")).toBe(true);
    expect(acl.checkPermission(userPermissions, "maliyet:read")).toBe(true);
    expect(acl.checkPermission(userPermissions, "pazarlama:read")).toBe(true);
    expect(acl.checkPermission(userPermissions, "pazarlama:*")).toBe(true);
    expect(acl.checkPermission(userPermissions, "muhasebe:update:own:new")).toBe(true);
    expect(acl.checkPermission(userPermissions, "muhasebe:update:new:own")).toBe(true);
    expect(acl.checkPermission(userPermissions, "error:read")).toBe(false);
    expect(acl.checkPermission(userPermissions, "genel:read")).toBe(true);
    expect(acl.checkPermission(userPermissions, "genel:*")).toBe(true);
    expect(acl.checkPermission(userPermissions, "finans:update:own")).toBe(true);
    expect(acl.checkPermission(userPermissions, "finans:update:own:new")).toBe(false);
    expect(acl.checkPermission(userPermissions, "finans:update")).toBe(false);
});
