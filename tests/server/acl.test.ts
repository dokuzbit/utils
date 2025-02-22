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
    roles: ["pazarlama", "muhasebe", "finans"],
    rules: ["maliyet:read", "can", "genel:*"],
}




const roles = [
    {
        role: "pazarlama",
        rights: ["pazarlama:read", "pazarlama:update:own"],
    },
    {
        role: "muhasebe",
        rights: ["muhasebe:read", "muhasebe:update:own:new"],
    },
    {
        role: "finans",
        rights: ["finans:read", "finans:update:own"],
    },
];

test("Can rolünün izinleri doğru mu?", () => {
    const t1 = performance.now();
    const userPermissions = acl.buildShortList(user, roles);
    const t2 = performance.now();
    console.log(acl.checkPermission(userPermissions, "can"));
    const t3 = performance.now();
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
    console.log(`buildShortList: ${t2 - t1}ms`);
    console.log(`checkPermission: ${t3 - t2}ms`);
});


// muhasebe:* diye wildcard bir yetki olmalı, yabi muhasebe altında tanımlanan tüm yetkilere onay ver
// muhasebe:* diye sorgulama yapabilmeliyiz, yani muhasebe ile başlayan herhangi bir yetki var mı?
// ikinci kolandan sonra gelen x sayıda property nin sırası fart etmemeli. Yani yetki muhasebe:delete:own:new iken muhasebe:delete:new:own diye sorduğumuzda true dönmeli.
// actions da opsiyonel olmalı sadece resource olarak yetki tanımlanabilir, sorgularken hata yapmamalı.
// yetki kontrolünde startswith kullanılmamalı, örneğin pazaralama:update:own:new yetkisi varken pazarlama:update.own sorgusu true döndü

