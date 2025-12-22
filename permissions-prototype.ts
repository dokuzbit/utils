const permissionList = new Map([
  ["*", "*:*"],
  ["us", "user:"],
  ["by", "bayi:"],
]);

// CRUD operasyonları için mapping
const operationMap = new Map([
  ["+", "create"],
  ["?", "read"],
  ["*", "update"],
  ["-", "delete"]
]);

const attributeMap = new Map([
  ["o", "own"],
  ["n", "new"],
]);


const roles = [
  { name: "superAdmin", permissions: ["*"] },
  {
    name: "admin",
    permissions: ["us%", "by%"],  // Tüm user ve bayi yetkileri
  },
  {
    name: "ik",
    permissions: ["us%"],
  },
  {
    name: "user",
    permissions: ["us.", "by.", "by+", "by*o", "by-o"],
  },
];

const users = new Map([
  ["can", { name: "can", roles: ["admin", "superAdmin"] }],
  [
    "tuğba",
    {
      name: "tuğba",
      roles: ["ik"],
      permissions: ["by%", "!by-"], // Tüm bayi yetkileri ama delete hariç
    },
  ],
  [
    "ali",
    {
      name: "ali",
      roles: ["user", "ik"],
      permissions: ["by%", "!by-"], // Tüm bayi yetkileri ama delete hariç
    },
  ],
  [
    "veli",
    {
      name: "veli",
      roles: ["user"],
      permissions: ["us-", "by-o", "by*o"],
    },
  ],
]);

function expandPermission(shortPermission: string): string {
  // Global wildcard kontrolü
  if (shortPermission === "*") return "*:*";

  // Negatif izin kontrolü
  const isNegative = shortPermission.startsWith('!');
  if (isNegative) {
    shortPermission = shortPermission.slice(1);
  }

  // Resource wildcard kontrolü
  if (shortPermission.endsWith('%')) {
    const resource = shortPermission.slice(0, -1);
    const basePermission = permissionList.get(resource);
    if (!basePermission) return undefined;
    return isNegative ? `!${basePermission}*` : `${basePermission}*`;
  }

  // Attribute'lu operatörleri kontrol et
  let resource, operation, attribute;
  const lastChar = shortPermission.slice(-1);

  if (attributeMap.has(lastChar)) {
    attribute = attributeMap.get(lastChar);
    resource = shortPermission.slice(0, -2);
    operation = shortPermission.slice(-2, -1);
  } else {
    resource = shortPermission.slice(0, -1);
    operation = lastChar;
    attribute = '';
  }

  // Temel kaynağı bul
  const basePermission = permissionList.get(resource);
  if (!basePermission) return undefined;

  // Operasyonu genişlet
  const expandedOperation = operationMap.get(operation);
  if (!expandedOperation) return undefined;

  const fullPermission = `${basePermission}${expandedOperation}${attribute}`;
  return isNegative ? `!${fullPermission}` : fullPermission;
}

function getUserPermissions(user) {
  const userRoles = roles.filter((role) => user.roles.includes(role.name));
  const rolePermissions = userRoles.flatMap((role) => role.permissions);
  const userPermissions = user.permissions || [];

  // Pozitif ve negatif izinleri ayır
  const negativePermissions = userPermissions
    .filter(p => p.startsWith('!'))
    .map(p => expandPermission(p))
    .filter(p => p !== undefined);

  // Tüm pozitif izinleri birleştir
  const allPermissions = [...rolePermissions, ...userPermissions.filter(p => !p.startsWith('!'))];

  // Attribute'lu yetkileri özel olarak işle
  const attributePermissions = allPermissions
    .filter(p => {
      const lastChar = p.slice(-1);
      return attributeMap.has(lastChar);
    })
    .map(p => {
      const base = p.slice(0, -2);
      const operation = p.slice(-2, -1);
      const attribute = p.slice(-1);

      // Her operasyon-attribute kombinasyonunu oluştur
      return [`${base}${operation}${attribute}`];
    })
    .flat();

  const positivePermissions = [...new Set([...allPermissions, ...attributePermissions])]
    .map(permission => expandPermission(permission))
    .filter(permission => permission !== undefined);

  return {
    positive: positivePermissions,
    negative: negativePermissions
  };
}


function checkPermission(user, permission) {
  if (!user) return false;
  const { positive: userPermissions, negative: negativePermissions } = getUserPermissions(user);

  // Önce negatif izinleri kontrol et
  for (const negPerm of negativePermissions) {
    const cleanNegPerm = negPerm.startsWith('!') ? negPerm.slice(1) : negPerm;

    // Tam eşleşme kontrolü
    if (cleanNegPerm === permission) return false;

    // Wildcard kontrolü
    if (cleanNegPerm.endsWith('*')) {
      const baseNegPerm = cleanNegPerm.slice(0, -1);
      if (permission.startsWith(baseNegPerm)) return false;
    }

    // Spesifik operasyon kontrolü
    const [negResource, negOperation] = cleanNegPerm.split(':');
    const [permResource, permOperation] = permission.split(':');
    if (negResource === permResource && negOperation === permOperation) return false;
  }

  // SuperAdmin kontrolü (global wildcard)
  if (userPermissions.includes("*:*")) return true;

  return userPermissions.some((userPerm) => {
    // Kullanıcının wildcard izni varsa
    if (userPerm?.endsWith('*')) {
      const basePermission = userPerm.slice(0, -1);
      return permission.startsWith(basePermission);
    }
    // Normal izin kontrolü
    return userPerm === permission;
  });
}

