type User = {
    roles: string[];
    rules: string[];
}

type Role = {
    role: string;
    rights: string[];
}

class ACL {

    private permissionMap: Record<string, string> = {};
    private permissionCache: Map<string, {
        resource: string;
        action: string;
        properties: string[];
    }> = new Map();

    public buildShortList(user: User, roles: Role[]) {
        // Kullanıcının rollerine ait yetkileri topla
        const rolePermissions = roles
            .filter(r => user.roles?.includes(r.role))
            .flatMap(r => r.rights);

        const userPermissions = user.rules || [];
        const allPermissions = [...rolePermissions, ...userPermissions];
        const shortPermissions = allPermissions.map(permission => this.shorten(permission));
        return shortPermissions;
    }

    public checkPermission(permissions: string[], permission: string): boolean {
        const shortPermission = this.shorten(permission);

        return permissions.some(shortUserPerm => {
            const originalUserPerm = this.findOriginalPermission(shortUserPerm);
            if (!originalUserPerm) return false;

            const userPermParts = this.parsePermissionParts(originalUserPerm);
            const checkPermParts = this.parsePermissionParts(permission);

            // Resource kontrolü
            if (userPermParts.resource !== checkPermParts.resource) {
                return false;
            }

            // Eğer sorgulanan yetki wildcard ise ve resource eşleşiyorsa true dön
            if (checkPermParts.action === '*') {
                return true;
            }

            // Kullanıcının wildcard yetkisi varsa izin ver
            if (userPermParts.action === '*') {
                return true;
            }

            // Action kontrolü
            if (userPermParts.action !== checkPermParts.action) {
                return false;
            }

            // Property'leri karşılaştır (sıradan bağımsız)
            const userProps = new Set(userPermParts.properties);
            const requiredProps = new Set(checkPermParts.properties);

            return requiredProps.size === userProps.size &&
                Array.from(requiredProps).every(prop => userProps.has(prop));
        });
    }

    private getPermissionParts(permission: string) {
        // Cache'de varsa direkt dön
        if (this.permissionCache.has(permission)) {
            return this.permissionCache.get(permission)!;
        }

        // Yoksa parse et ve cache'le
        const parts = this.parsePermissionParts(permission);
        this.permissionCache.set(permission, parts);
        return parts;
    }

    private findOriginalPermission(shortCode: string): string | undefined {
        return Object.entries(this.permissionMap)
            .find(([_, code]) => code === shortCode)?.[0];
    }

    private parsePermissionParts(permission: string): {
        resource: string;
        action: string;
        properties: string[];
    } {
        const [resource = '', action = '', ...properties] = permission.split(':').filter(Boolean);
        return {
            resource,
            action,
            properties
        };
    }

    // yetkileri 5 karakterli kısa taglere çevirir.
    private shorten(name: string) {
        if (this.permissionMap[name]) {
            return this.permissionMap[name];
        }

        // Daha iyi bir hash algoritması kullanalım (FNV-1a)
        const FNV_PRIME = 0x01000193;
        const FNV_OFFSET_BASIS = 0x811c9dc5;

        let hash = FNV_OFFSET_BASIS;
        for (let i = 0; i < name.length; i++) {
            hash ^= name.charCodeAt(i);
            hash = Math.imul(hash, FNV_PRIME);
        }

        // Base36'ya çevir ve 5 karakter al
        const shortCode = Math.abs(hash).toString(36).slice(0, 5);
        this.permissionMap[name] = shortCode;
        return shortCode;
    }
}

export const acl = new ACL();




