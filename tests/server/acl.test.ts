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
        rules: ["pazarlama:read", "pazarlama:ownUpdate"],
    },
    {
        role: "muhasebe",
        rules: ["muhasebe:read", "muhasebe:ownUpdate:new"],
    },
    {
        role: "finans",
        rules: ["finans:read", "finans:ownUpdate"],
    },
    {
        role: "admin",
        rules: ["muhasebe:delete", "satis:read:otomasyon"],
    },
];

const permissions = [
    "9l1k9R", "9l1k9u", "i6is6R", "i6is6unew", "bh2wpR", "bh2wpu", "i6is6D", "6p3q6Rza2h", "xr9sxR",
    "4ba8w", "rbsiaA"
]

test("Can rolünün izinleri doğru mu?", () => {
    // const permissions = acl.buildShortList(user, roles);
    // console.log(permissions);
    expect(acl.checkPermission(permissions, "satis:read:otomasyon1")).toBe(false);
    expect(acl.checkPermission(permissions, "satis:read")).toBe(false);
    expect(acl.checkPermission(permissions, "satis:*")).toBe(true);
    expect(acl.checkPermission(permissions, "genel:read")).toBe(true);
    expect(acl.checkPermission(permissions, "genel:*")).toBe(true);
    expect(acl.checkPermission(permissions, "maliyet:read")).toBe(true);
    expect(acl.checkPermission(permissions, "maliyet:delete")).toBe(false);
    expect(acl.checkPermission(permissions, "can")).toBe(true);
    expect(acl.checkPermission(permissions, "maliyet:read")).toBe(true);
    expect(acl.checkPermission(permissions, "pazarlama:read")).toBe(true);
    expect(acl.checkPermission(permissions, "muhasebe:ownUpdate:new")).toBe(true);
    expect(acl.checkPermission(permissions, "muhasebe:ownUpdate")).toBe(false);
    expect(acl.checkPermission(permissions, "error:read")).toBe(false);
    expect(acl.checkPermission(permissions, "finans:ownUpdate")).toBe(true);
    expect(acl.checkPermission(permissions, "finans:ownUpdate:new")).toBe(false);
    expect(acl.checkPermission(permissions, "finans:update")).toBe(false);
    expect(acl.checkPermission(permissions, "pazarlama:*")).toBe(true);
    expect(acl.checkPermission(permissions, "satis:read:otomasyon")).toBe(true);
});
