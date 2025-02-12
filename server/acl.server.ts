export class ACL {
    actionMap: Map<string, string>;
    attributeMap: Map<string, string>;
    permissionMap: Map<string, string>;
    constructor(actions?: string[][], attributes?: string[][], permissions?: string[][]) {
        this.actionMap = new Map();
        this.attributeMap = new Map();
        this.permissionMap = new Map();
        if (actions && attributes && permissions) {
            this.init(actions, attributes, permissions);
        }
    }

    public init(actions: string[][], attributes: string[][], permissions: string[][]) {
        this.actionMap = new Map(actions.map(action => [action[0], action[1]]));
        this.attributeMap = new Map(attributes.map(attribute => [attribute[0], attribute[1]]));
        this.permissionMap = new Map(permissions.map(permission => [permission[0], permission[1]]));
    }

    public getPermissions(user: { roles: string[], permissions?: string[] }, roles: { name: string, permissions: string[] }[]) {
        // Kullanıcının rollerinden gelen izinleri al
        const rolePermissions = roles
            .filter(role => user.roles?.includes(role.name))
            .flatMap(role => role.permissions);

        // Kullanıcının direkt izinlerini al
        const userPermissions = user.permissions || [];

        // Tüm izinleri birleştir
        const allPermissions = [...rolePermissions, ...userPermissions];

        // Permission'ları filtrele
        return [...new Set(allPermissions)].filter(permission => {
            if (permission === '*') return true;

            // Negatif izin kontrolü
            if (permission.startsWith('!')) {
                const cleanPerm = permission.slice(1);
                const resource = this.getResourceFromPermission(cleanPerm);
                return this.permissionMap.has(resource);
            }

            const resource = this.getResourceFromPermission(permission);
            return this.permissionMap.has(resource);
        });
    }

    // Yardımcı metod
    private getResourceFromPermission(permission: string): string {
        // Wildcard kontrolü
        if (permission.endsWith('%')) {
            return permission.slice(0, -1);
        }

        // İzindeki action karakterini bul
        for (let i = 0; i < permission.length; i++) {
            if (this.actionMap.has(permission[i])) {
                // Action karakterinden önceki kısım resource'dur
                return permission.slice(0, i);
            }
        }

        // Eğer action bulunamazsa son karakteri çıkar
        return permission.slice(0, -1);
    }

    public checkPermission(permissions: string[], requestedLongPermission: string): boolean {
        if (!permissions || permissions.length === 0) return false;

        const [resource, action, ...attributes] = requestedLongPermission.split(':');

        // Global wildcard kontrolü: Kaynak tanımlı değilse false dönmelidir!
        if (permissions.includes('*')) {
            const resourceExists = Array.from(this.permissionMap.entries())
                .some(([_, value]) => value === resource);
            if (!resourceExists) return false;
            return true;
        }

        // Resource'un kısa halini bul
        const shortResource = Array.from(this.permissionMap.entries())
            .find(([_, value]) => value === resource)?.[0];
        if (!shortResource) return false;

        // Action'ın kısa halini bul
        const shortAction = Array.from(this.actionMap.entries())
            .find(([_, value]) => value === action)?.[0];
        if (!shortAction) return false;

        // Önce negatif izinleri kontrol et
        const negativePermissions = permissions.filter(p => p.startsWith('!'));
        for (const negPerm of negativePermissions) {
            const cleanPerm = negPerm.slice(1);
            // Eğer negatif izin direkt resource ve action'la eşleşiyorsa, erişimi reddet.
            if (cleanPerm === `${shortResource}${shortAction}`) return false;
            // Wildcard negatif izin kontrolü (örn: "usr%")
            if (cleanPerm.endsWith('%') && shortResource === cleanPerm.slice(0, -1)) return false;
        }

        // Resource wildcard kontrolü (örn: "usr%")
        if (permissions.includes(`${shortResource}%`)) return true;

        // Pozitif izinleri kontrol et
        return permissions.some(permission => {
            if (permission.startsWith('!')) return false;

            // Resource kontrolü
            if (!permission.startsWith(shortResource)) return false;

            // Action kontrolü (attribute'suz izin için)
            if (permission === `${shortResource}${shortAction}`) return true;

            // Action kontrolü (attribute'lu izin için)
            const permAction = permission.slice(shortResource.length, shortResource.length + 1);
            if (permAction !== shortAction) return false;

            // Attribute kontrolü
            const permAttributes = permission.slice(shortResource.length + 1).split('');

            // İstenen attribute'ların tamamını, izinde de olmalı
            const requiredAttributes = attributes.map(attr =>
                Array.from(this.attributeMap.entries())
                    .find(([_, value]) => value === attr)?.[0]
            ).filter(Boolean);

            return requiredAttributes.every(attr => permAttributes.includes(attr))
                && permAttributes.length === requiredAttributes.length;
        });
    }

    // Uzun formattan kısa tag'e çeviren yardımcı fonksiyon
    private getShortTag(longPermission: string): string | undefined {
        const [resource, action, ...attributes] = longPermission.split(':');

        // Resource'u kısa tag'e çevir
        const shortResource = Array.from(this.permissionMap.entries())
            .find(([_, value]) => value === resource)?.[0];
        if (!shortResource) return undefined;

        // Action'ı kısa tag'e çevir
        const shortAction = Array.from(this.actionMap.entries())
            .find(([_, value]) => value === action)?.[0];
        if (!shortAction) return undefined;

        // Tüm attribute'ları kısa tag'e çevir ve alfabetik sırala
        if (attributes.length > 0) {
            const shortAttributes = attributes
                .map(attr => Array.from(this.attributeMap.entries())
                    .find(([_, value]) => value === attr)?.[0])
                .filter(attr => attr !== undefined)
                .sort()  // Alfabetik sırala
                .join('');

            return `${shortResource}${shortAction}${shortAttributes}`;
        }

        return `${shortResource}${shortAction}`;
    }

    private expandPermission(shortPermission: string): string | undefined {
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
            const basePermission = this.permissionMap.get(resource);
            if (!basePermission) return undefined;
            return isNegative ? `!${basePermission}*` : `${basePermission}*`;
        }

        // Attribute'lu operatörleri kontrol et
        let resource, operation, attribute;
        const lastChar = shortPermission.slice(-1);

        if (this.attributeMap.has(lastChar)) {
            attribute = this.attributeMap.get(lastChar);
            resource = shortPermission.slice(0, -2);
            operation = shortPermission.slice(-2, -1);
        } else {
            resource = shortPermission.slice(0, -1);
            operation = lastChar;
            attribute = '';
        }

        // Temel kaynağı bul
        const basePermission = this.permissionMap.get(resource);
        if (!basePermission) return undefined;

        // Operasyonu genişlet
        const expandedOperation = this.actionMap.get(operation);
        if (!expandedOperation) return undefined;

        const fullPermission = `${basePermission}${expandedOperation}${attribute ? ':' + attribute : ''}`;
        return isNegative ? `!${fullPermission}` : fullPermission;
    }

    // Rolleri dışarıdan alacak şekilde güncellendi
    public listPermissions(user: { roles: string[], permissions?: string[] }, roles: { name: string, permissions: string[] }[]) {
        const userRoles = roles.filter(role => user.roles?.includes(role.name));
        const rolePermissions = userRoles.flatMap(role => role.permissions);
        const userPermissions = user.permissions || [];

        // Pozitif ve negatif izinleri ayır
        const negativePermissions = userPermissions
            .filter(p => p.startsWith('!'))
            .map(p => this.expandPermission(p))
            .filter(p => p !== undefined);

        // Tüm pozitif izinleri birleştir
        const allPermissions = [...rolePermissions, ...userPermissions.filter(p => !p.startsWith('!'))];

        // Attribute'lu yetkileri özel olarak işle
        const attributePermissions = allPermissions
            .filter(p => {
                const lastChar = p.slice(-1);
                return this.attributeMap.has(lastChar);
            })
            .map(p => {
                const base = p.slice(0, -2);
                const operation = p.slice(-2, -1);
                const attribute = p.slice(-1);
                return `${base}${operation}${attribute}`;
            });

        const positivePermissions = [...new Set([...allPermissions, ...attributePermissions])]
            .map(permission => this.expandPermission(permission))
            .filter(permission => permission !== undefined);

        return {
            positive: positivePermissions,
            negative: negativePermissions
        };
    }

    public buildPermissionList(user: { roles: string[], permissions?: string[] }, roles: { name: string, permissions: string[] }[]) {
        // Debug için
        console.log("Building permissions for roles:", user.roles);

        // Kullanıcının rollerinden gelen izinleri al
        const rolePermissions = roles
            .filter(role => user.roles?.includes(role.name))
            .flatMap(role => role.permissions);

        console.log("Role permissions:", rolePermissions);

        // Kullanıcının direkt izinlerini al
        const userPermissions = user.permissions || [];

        // Tüm izinleri birleştir
        const allPermissions = [...rolePermissions, ...userPermissions];

        // Permission'ları filtrele
        const filteredPermissions = [...new Set(allPermissions)].filter(permission => {
            if (permission === '*') return true;

            // Negatif izin kontrolü
            if (permission.startsWith('!')) {
                const cleanPerm = permission.slice(1);
                const resource = this.getResourceFromPermission(cleanPerm);
                return this.permissionMap.has(resource);
            }

            const resource = this.getResourceFromPermission(permission);
            return this.permissionMap.has(resource);
        });

        console.log("Filtered permissions:", filteredPermissions);
        return filteredPermissions;
    }
}

export const acl = new ACL();
