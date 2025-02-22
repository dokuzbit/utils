type User = {
    roles: string[];
    rules: string[];
}

type Role = {
    role: string;
    rules: string[];
}

const actions = new Map([
    ['*', 'A'],
    ['create', 'C'],
    ['owncreate', 'c'],
    ['read', 'R'],
    ['ownread', 'r'],
    ['update', 'U'],
    ['ownupdate', 'u'],
    ['delete', 'D'],
    ['owndelete', 'd'],
    ['confirm', 'X'],
    ['ownconfirm', 'x'],
]);

class ACL {

    private permissionMap: Record<string, string> = {};

    public buildShortList(user: User, roles: Role[]) {
        // Null/undefined kontrolü
        if (!user || !roles?.length) return [];

        // Kullanıcı süper admin mi kontrol et
        if (Array.isArray(user.rules) && user.rules.includes('superadmin')) return [this.shorten('superadmin')];

        // Kullanıcının rollerine ait yetkileri topla
        const rolePermissions = roles
            .filter(r => Array.isArray(user.roles) && user.roles.includes(r.role))
            .flatMap(r => r.rules || [])
            .map(permission => {
                const [resource = '', action = '', ...props] = permission.split(':');
                return [resource, action, ...props.sort()].join(':');
            });

        const userPermissions = Array.isArray(user.rules)
            ? user.rules.map(permission => {
                const [resource = '', action = '', ...props] = permission.split(':');
                return [resource, action, ...props.sort()].join(':');
            })
            : [];
        const allPermissions = [...rolePermissions, ...userPermissions];
        const shortPermissions = allPermissions.map(permission => this.shorten(permission));
        return shortPermissions;
    }

    public checkPermission(permissions: string[], permission: string): boolean {
        // Null/undefined kontrolü
        if (!Array.isArray(permissions) || !permission) return false;

        // Süper admin kontrolü - artık sadece kısa kodu kontrol ediyoruz
        if (permissions.includes(this.shorten('superadmin'))) return true;

        // Önce tam kontrol yapalım, eğer varsa direk true dön
        if (permissions.includes(this.shorten(permission))) return true;
        // Artık kısa kodu parçalara bölüp işlem yapacağız
        const [resource = '', action = '', attribute = ''] = permission.split(':');

        // Wildcard kontrolü. Örneğin: "maliyet:*" varsa tüm maliyetleri kapsıyor.
        if (permissions.includes(this.shorten(`${resource}:*`))) return true;
        // Wildcard sorgulama. Örneğin: "maliyet:read" varsa "maliyet:*" sorgusu true döner.
        // Bunun için permissionsların ilk 5 karakterini kontrol ediyoruz.
        if (action === '*') {
            for (const perm of permissions) {
                if (perm.substring(0, 5) === this.shorten(resource)) {
                    return true;
                }
            }
        }

        return false;
    }

    private shorten(name: string) {
        if (this.permissionMap[name]) return this.permissionMap[name];
        const [resource = '', action = '', attribute = ''] = name.split(':');
        const encodedResource = this.FNV_1a(resource);
        const encodedAction = actions.get(action.toLowerCase()) || '';
        const encodedAttribute = attribute.length < 4 ? attribute : this.FNV_1a(attribute, 4);
        const shortCode = `${encodedResource}${encodedAction}${encodedAttribute}`;
        this.permissionMap[name] = shortCode;
        return shortCode;
    }

    private FNV_1a(input: string, length = 5): string {
        const FNV_PRIME = 0x01000193;
        const FNV_OFFSET_BASIS = 0x811c9dc5;

        let hash = FNV_OFFSET_BASIS;
        for (let i = 0; i < input.length; i++) {
            hash ^= input.charCodeAt(i);
            hash = Math.imul(hash, FNV_PRIME);
        }
        return Math.abs(hash).toString(36).slice(0, length);
    }

}

export const acl = new ACL();




