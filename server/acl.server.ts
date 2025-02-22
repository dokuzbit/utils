type User = {
    roles: string[];
    rules: string[];
}

type Role = {
    role: string;
    rules: string[];
}

class ACL {

    private permissionMap: Record<string, string> = {};
    private permissionCache: Map<string, {
        resource: string;
        action: string;
        properties: string[];
    }> = new Map();

    public buildShortList(user: User, roles: Role[]) {
        // Null/undefined kontrolü
        if (!user || !roles?.length) return [];

        // Kullanıcı süper admin mi kontrol et
        if (Array.isArray(user.rules) && user.rules.includes('superadmin')) {
            return [this.shorten('superadmin')];
        }

        // Kullanıcının rollerine ait yetkileri topla
        const rolePermissions = roles
            .filter(r => Array.isArray(user.roles) && user.roles.includes(r.role))
            .flatMap(r => r.rules || []);

        const userPermissions = Array.isArray(user.rules) ? user.rules : [];
        const allPermissions = [...rolePermissions, ...userPermissions];
        const shortPermissions = allPermissions.map(permission => this.shorten(permission));
        return shortPermissions;
    }

    public checkPermission(permissions: string[], permission: string): boolean {
        // Null/undefined kontrolü
        if (!Array.isArray(permissions) || !permission) return false;

        // Süper admin kontrolü - artık sadece kısa kodu kontrol ediyoruz
        const superAdminCode = this.shorten('superadmin');
        if (permissions.includes(superAdminCode)) return true;

        // Sorgulanan yetkiyi bir kez parse edelim
        const [checkResource = '', checkAction = '', ...checkProps] = permission.split(':').filter(Boolean);
        const sortedCheckProps = checkProps.sort().join();

        return permissions.some(shortUserPerm => {
            if (!shortUserPerm) return false;

            const originalUserPerm = this.findOriginalPermission(shortUserPerm);
            if (!originalUserPerm) return false;

            const [userResource = '', userAction = '', ...userProps] = originalUserPerm.split(':').filter(Boolean);

            // En hızlı kontrollerden başlayalım
            if (userResource !== checkResource) return false;
            if (checkAction === '*') return true;
            if (userAction === '*') return true;
            if (userAction !== checkAction) return false;
            if (userProps.length !== checkProps.length) return false;

            // Property karşılaştırması en son (en maliyetli işlem)
            return userProps.sort().join() === sortedCheckProps;
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




