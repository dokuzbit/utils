// Veirtabanında saklanacak alanlar
// user.roles = 'admin, superAdmin, user'
// user.permissions = 'usc, usr, by*'
// sec_roles.name = 'admin'
// sec_roles.permissions = 'usr, usw, usd'
// sonra bunları build permissions ile birleştirip csv olarak jwt ye ekleyeceğim
// sveltekit sunucu cacheleyecek şekilde bir tablo oluşturacak ve load ile client e geçirecek
// client ve server da checkPermission bu tabloyu kullanacak

const permissionList = new Map([
  ["*", "*:*"],
  ["usc", "users:create"],
  ["usr", "users:read"],
  ["usu", "users:update"],
  ["usd", "users:delete"],
  ["by*", "bayi:*"],
  ["byc", "bayi:create"],
  ["byr", "bayi:read"],
  ["byu", "bayi:update"],
  ["byd", "bayi:delete"],
  ["bydo", "bayi:deleteown"],
]);

const roles = [
  { name: "superAdmin", permissions: ["*"] },
  {
    name: "admin",
    permissions: ["usr", "usw", "usd"],
  },
  {
    name: "ik",
    permissions: ["usr", "usu"],
  },
  {
    name: "user",
    permissions: ["usr", "byr", "byc", "bydo"],
  },
];

const users = new Map([
  [
    "can",
    {
      name: "can",
      roles: ["admin", "superAdmin"],
    },
  ],
  [
    "tuğba",
    {
      name: "tuğba",
      roles: ["ik"],
    },
  ],
  [
    "ali",
    {
      name: "ali",
      roles: ["user", "ik"],
      permissions: ["by*"],
    },
  ],
  [
    "veli",
    {
      name: "veli",
      roles: ["user"],
      permissions: ["usd"],
    },
  ],
]);

function getUserPermissions(user) {
  const userRoles = roles.filter((role) => user.roles.includes(role.name));
  const rolePermissions = userRoles.flatMap((role) => role.permissions);
  const userPermissions = user.permissions || [];

  // Tüm izinleri birleştir, Map'ten uzun hallerini al ve undefined'ları filtrele
  const allPermissions = [...new Set([...rolePermissions, ...userPermissions])];
  return allPermissions
    .map((permission) => permissionList.get(permission))
    .filter((permission) => permission !== undefined); // undefined'ları filtrele
}

console.log(getUserPermissions(users.get("ali")));

function checkPermission(user, permission) {
  if (!user) return false;
  const userPermissions = getUserPermissions(user);

  // SuperAdmin kontrolü (global wildcard)
  if (userPermissions.includes("*:*")) return true;

  return userPermissions.some((userPerm) => {
    // Kullanıcının izni wildcard ise
    if (userPerm?.endsWith(":*")) {
      const basePermission = userPerm.slice(0, -2);
      return permission.startsWith(basePermission);
    }
    // Sorgulanan izin wildcard (?) ise
    if (permission.endsWith(":?")) {
      const basePermission = permission.slice(0, -2);
      return userPerm.startsWith(basePermission);
    }
    // Normal izin kontrolü
    return userPerm === permission;
  });
}

console.log(checkPermission(users.get("ali"), "users:delete"));
