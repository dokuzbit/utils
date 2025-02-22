import { expect, test } from 'bun:test';
import { acl, ACL } from "../../server/acl.server";


const user = {
    "roles": [
        "pazarlama",
        "muhasebe",
        "finans"
    ],
    "rules": [
        "maliyet:read"
    ]
}

const roles = {

    pazarlama: [
        "pazarlama:read",
        "pazarlama:update:own"
    ]
}



test("Can rolünün izinleri doğru mu?", () => {
    const acl = new ACL();
    const userPermissions = acl.buildShortList(user, roles);
    console.log(acl.checkPermission(userPermissions, "pazarlama:read"));

    // console.log(myACL.buildPermissionList(users[6], roles));

    // const can = users[6];
    // const userPermissions = myACL.getPermissions(can, roles);
    // console.log(userPermissions);
    // expect(myACL.checkPermission(userPermissions, "can:create")).toBe(true);
    // expect(myACL.checkPermission(userPermissions, "can:read")).toBe(true);

});

// test("SuperAdmin tüm izinlere sahip olmalı", () => {
//     const myACL = new ACL(actions, attributes, permissions);
//     const userPermissions = myACL.getPermissions(users[0], roles);
//     expect(myACL.checkPermission(userPermissions, "invoice:delete")).toBe(true);
//     expect(myACL.checkPermission(userPermissions, "userlist:create:own")).toBe(true);
//     expect(myACL.checkPermission(userPermissions, "unknown:read")).toBe(false);
// });

// test("Admin rolündeki kullanıcı userlist ve invoice işlemlerine erişebilmeli", () => {
//     const myACL = new ACL(actions, attributes, permissions);
//     const admin = users[1];
//     const userPermissions = myACL.getPermissions(admin, roles);

//     expect(myACL.checkPermission(userPermissions, "userlist:read")).toBe(true);
//     expect(myACL.checkPermission(userPermissions, "userlist:update:own")).toBe(true);
//     expect(myACL.checkPermission(userPermissions, "invoice:delete:new")).toBe(true);
//     expect(myACL.checkPermission(userPermissions, "invoice:create")).toBe(true);

//     expect(myACL.checkPermission(userPermissions, "unknown:read")).toBe(false);
// });

// test("Accounting ve user rollerinin birleşimindeki kullanıcı için izin kontrolleri", () => {
//     const myACL = new ACL(actions, attributes, permissions);
//     const accounting = users[2];
//     const userPermissions = myACL.getPermissions(accounting, roles);

//     expect(myACL.checkPermission(userPermissions, "userlist:update:own")).toBe(true);
//     expect(myACL.checkPermission(userPermissions, "userlist:delete:own:new")).toBe(true);

//     expect(myACL.checkPermission(userPermissions, "invoice:read")).toBe(true);
//     expect(myACL.checkPermission(userPermissions, "invoice:create")).toBe(true);
//     expect(myACL.checkPermission(userPermissions, "invoice:update:own")).toBe(true);
//     expect(myACL.checkPermission(userPermissions, "invoice:delete:new")).toBe(true);
//     expect(myACL.checkPermission(userPermissions, "invoice:delete")).toBe(false);
// });

// test("AccountingAdmin negatif izin işlemiyle kısıtlanmalı", () => {
//     const myACL = new ACL(actions, attributes, permissions);
//     const accountingAdmin = users[3];
//     const userPermissions = myACL.getPermissions(accountingAdmin, roles);

//     expect(myACL.checkPermission(userPermissions, "invoice:delete")).toBe(false);
//     expect(myACL.checkPermission(userPermissions, "invoice:read")).toBe(true);
//     expect(myACL.checkPermission(userPermissions, "invoice:delete:new")).toBe(false);
// });

// test("Sadece user rolüne sahip kullanıcı için testler", () => {
//     const myACL = new ACL(actions, attributes, permissions);
//     const user = users[4];
//     const userPermissions = myACL.getPermissions(user, roles);

//     expect(myACL.checkPermission(userPermissions, "userlist:read")).toBe(true);
//     expect(myACL.checkPermission(userPermissions, "userlist:update:own")).toBe(true);
//     expect(myACL.checkPermission(userPermissions, "userlist:delete:own:new")).toBe(true);
//     expect(myACL.checkPermission(userPermissions, "userlist:delete:new")).toBe(false);
// });

// test("UserAdmin direkt izinleri eklenmiş kullanıcı", () => {
//     const myACL = new ACL(actions, attributes, permissions);
//     const userAdmin = users[5];
//     const userPermissions = myACL.getPermissions(userAdmin, roles);

//     expect(myACL.checkPermission(userPermissions, "userlist:create")).toBe(true);
//     expect(myACL.checkPermission(userPermissions, "userlist:read:own")).toBe(true);
//     expect(myACL.checkPermission(userPermissions, "userlist:delete:own:new")).toBe(true);
// });
