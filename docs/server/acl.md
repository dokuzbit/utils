# acl - Access Control List Manager

## Installation

[Installation](../common.md#installation), [Singleton Pattern](../common.md#singleton-pattern), [Multiton Pattern](../common.md#multiton-pattern) and [Default Import](../common.md#default-import) is documented in [here](../common.md)

```ts
import { acl } from "@dokuzbit/utils/server";
// or
import aclManager from "@dokuzbit/utils/server/acl";
// ☝️ We export the singleton instance as default for easy aliasing
```

## Overview

ACL (Access Control List) is a lightweight, high-performance permission management system that uses hash-based short codes for efficient permission storage and checking. It supports role-based access control (RBAC) with hierarchical permissions.

### Permission Format

Permissions follow the pattern: `resource:action:attribute`

- **resource**: The entity being accessed (e.g., "users", "products", "orders")
- **action**: The operation being performed (see Actions table below)
- **attribute**: Optional additional context (e.g., "draft", "published")

### Supported Actions

| Action       | Short Code | Description                    |
| ------------ | ---------- | ------------------------------ |
| `*`          | `A`        | All permissions (wildcard)     |
| `create`     | `C`        | Create new resources           |
| `owncreate`  | `c`        | Create own resources only      |
| `read`       | `R`        | Read/view resources            |
| `ownread`    | `r`        | Read own resources only        |
| `update`     | `U`        | Update resources               |
| `ownupdate`  | `u`        | Update own resources only      |
| `delete`     | `D`        | Delete resources               |
| `owndelete`  | `d`        | Delete own resources only      |
| `confirm`    | `X`        | Confirm/approve resources      |
| `ownconfirm` | `x`        | Confirm own resources only     |

## .buildShortList(user, roles) - Build permission list

Creates an optimized short-code permission list from user and role data. This method combines role-based permissions with user-specific permissions and converts them to efficient hash codes.

- user: `User` - User object with roles and rules
  - roles: `string[]` - Array of role names assigned to the user
  - rules: `string[]` - Array of direct permissions granted to the user
- roles: `Role[]` - Array of role definitions
  - role: `string` - Role name
  - rules: `string[]` - Array of permissions granted to this role
- returns: `string[]` - Array of short-code permissions

```ts
const user = {
  roles: ["editor", "reviewer"],
  rules: ["articles:delete", "comments:*"],
};

const roles = [
  {
    role: "editor",
    rules: ["articles:read", "articles:update"],
  },
  {
    role: "reviewer",
    rules: ["articles:read", "articles:ownupdate"],
  },
];

const permissions = acl.buildShortList(user, roles);
console.log(permissions);
// ['9l1k9R', 'i6is6U', 'i6is6u', 'xr9sxD', '4ba8wA']
// ☝️ Short codes representing all granted permissions
```

### Superadmin Handling

If a user has `superadmin` in their rules array, the function returns only the superadmin short code, which grants all permissions:

```ts
const superUser = {
  roles: [],
  rules: ["superadmin"],
};

const permissions = acl.buildShortList(superUser, []);
console.log(permissions); // ['<superadmin_hash>']
// ☝️ This user has access to everything
```

## .checkPermission(permissions, permission) - Check access

Verifies if a given permission exists in the user's permission list. Supports exact matching, wildcard permissions, and resource-level wildcards.

- permissions: `string[]` - Short-code permission list from `buildShortList()`
- permission: `string` - The permission to check (in format: `resource:action` or `resource:action:attribute`)
- returns: `boolean` - `true` if permission is granted, `false` otherwise

```ts
const permissions = acl.buildShortList(user, roles);

// Exact permission check
if (acl.checkPermission(permissions, "articles:read")) {
  console.log("User can read articles");
}

// Check with attribute
if (acl.checkPermission(permissions, "articles:update:draft")) {
  console.log("User can update draft articles");
}

// Check against wildcard
if (acl.checkPermission(permissions, "comments:delete")) {
  // ☝️ Returns true if user has 'comments:*' or 'comments:delete'
  console.log("User can delete comments");
}
```

### Permission Checking Logic

The function checks permissions in the following order:

1. **Superadmin check**: If permissions include `superadmin`, returns `true` immediately
2. **Exact match**: Checks if the exact permission exists
3. **Resource wildcard**: Checks if `resource:*` exists (e.g., `articles:*` grants all article actions)
4. **Wildcard query**: If checking `resource:*`, returns `true` if any permission for that resource exists

```ts
const permissions = ["xr9sxA"]; // articles:* (wildcard for all article actions)

acl.checkPermission(permissions, "articles:read"); // true
acl.checkPermission(permissions, "articles:update"); // true
acl.checkPermission(permissions, "articles:delete"); // true
acl.checkPermission(permissions, "articles:*"); // true
acl.checkPermission(permissions, "users:read"); // false
```

## Type Definitions

```ts
type User = {
  roles: string[];
  rules: string[];
};

type Role = {
  role: string;
  rules: string[];
};
```

## Example Usage in SvelteKit

### hooks.server.ts - Load user permissions

```ts
import { acl } from "@dokuzbit/utils/server";
import { session } from "@dokuzbit/utils/server";

export async function handle({ event, resolve }) {
  // Get user from session
  session.config({ cookies: event.cookies });
  const result = await session.getToken(undefined, true);

  if (!result.error && !result.expired) {
    // Fetch user roles and permissions from database
    const user = await db.query("SELECT * FROM users WHERE id = ? LIMIT 1", [
      result.payload.userId,
    ]);

    const roles = await db.query(
      "SELECT r.role, GROUP_CONCAT(p.permission) as rules FROM roles r LEFT JOIN role_permissions p ON r.id = p.role_id GROUP BY r.role"
    );

    // Build permission list
    const userWithPermissions = {
      roles: user.roles || [],
      rules: user.permissions || [],
    };

    const permissions = acl.buildShortList(userWithPermissions, roles);

    // Store in locals for access in routes
    event.locals.user = result.payload;
    event.locals.permissions = permissions;
  }

  return resolve(event);
}
```

### +page.server.ts - Protected route with permission check

```ts
import { acl } from "@dokuzbit/utils/server";
import { error, redirect } from "@sveltejs/kit";

export async function load({ locals }) {
  // Check if user is authenticated
  if (!locals.user) {
    throw redirect(303, "/login");
  }

  // Check if user has permission to read articles
  if (!acl.checkPermission(locals.permissions, "articles:read")) {
    throw error(403, "You don't have permission to view articles");
  }

  // User has permission, load data
  const articles = await db.query("SELECT * FROM articles");

  return {
    articles,
  };
}
```

### +page.server.ts - Action with permission check

```ts
import { acl } from "@dokuzbit/utils/server";
import { error } from "@sveltejs/kit";

export const actions = {
  delete: async ({ request, locals }) => {
    // Check delete permission
    if (!acl.checkPermission(locals.permissions, "articles:delete")) {
      throw error(403, "You don't have permission to delete articles");
    }

    const data = await request.formData();
    const articleId = data.get("id");

    await db.query("DELETE FROM articles WHERE id = ?", [articleId]);

    return { success: true };
  },

  update: async ({ request, locals }) => {
    // Check update permission
    if (!acl.checkPermission(locals.permissions, "articles:update")) {
      throw error(403, "You don't have permission to update articles");
    }

    const data = await request.formData();
    // ... update logic
  },
};
```

### +page.svelte - UI based on permissions

```svelte
<script lang="ts">
  export let data;

  // Permissions are passed from server
  const canUpdate = data.canUpdate;
  const canDelete = data.canDelete;
</script>

{#each data.articles as article}
  <div class="article">
    <h2>{article.title}</h2>
    <p>{article.content}</p>

    <div class="actions">
      {#if canUpdate}
        <button>Edit</button>
      {/if}

      {#if canDelete}
        <button>Delete</button>
      {/if}
    </div>
  </div>
{/each}
```

```ts
// +page.server.ts for the above component
export async function load({ locals }) {
  const articles = await db.query("SELECT * FROM articles");

  return {
    articles,
    canUpdate: acl.checkPermission(locals.permissions, "articles:update"),
    canDelete: acl.checkPermission(locals.permissions, "articles:delete"),
  };
}
```

## Advanced Usage

### Hierarchical Permissions

Using the attribute parameter for more granular control:

```ts
const user = {
  roles: ["editor"],
  rules: [],
};

const roles = [
  {
    role: "editor",
    rules: [
      "articles:update:draft", // Can only update drafts
      "articles:read:published", // Can only read published
    ],
  },
];

const permissions = acl.buildShortList(user, roles);

acl.checkPermission(permissions, "articles:update:draft"); // true
acl.checkPermission(permissions, "articles:update:published"); // false
acl.checkPermission(permissions, "articles:read:published"); // true
```

### Wildcard Permissions

Grant all permissions for a resource:

```ts
const adminUser = {
  roles: [],
  rules: ["articles:*"], // All article permissions
};

const permissions = acl.buildShortList(adminUser, []);

acl.checkPermission(permissions, "articles:create"); // true
acl.checkPermission(permissions, "articles:read"); // true
acl.checkPermission(permissions, "articles:update"); // true
acl.checkPermission(permissions, "articles:delete"); // true
```

### Combining User and Role Permissions

Users can have both role-based and direct permissions:

```ts
const user = {
  roles: ["reviewer"], // Role-based permissions
  rules: ["articles:delete"], // Direct permission
};

const roles = [
  {
    role: "reviewer",
    rules: ["articles:read", "articles:ownupdate"],
  },
];

const permissions = acl.buildShortList(user, roles);
// ☝️ Combines both role permissions and user-specific permissions

acl.checkPermission(permissions, "articles:read"); // true (from role)
acl.checkPermission(permissions, "articles:ownupdate"); // true (from role)
acl.checkPermission(permissions, "articles:delete"); // true (direct permission)
```

## Performance Optimization

### Short Codes

ACL uses FNV-1a hash algorithm to convert long permission strings into 5-character short codes, dramatically reducing memory usage and comparison speed:

```ts
// Original permission
"articles:read"; // 13 bytes

// Short code
"9l1k9R"; // 6 bytes (54% smaller)
```

For large applications with thousands of users and millions of permission checks, this can save significant memory and CPU time.

### Caching

The ACL system automatically caches permission conversions. Once a permission is converted to a short code, the mapping is stored in memory for instant lookups.

## Best Practices

1. **Build permissions once**: Call `buildShortList()` once per request (in hooks) and reuse the result
2. **Use wildcards wisely**: `resource:*` gives all permissions for a resource, use carefully
3. **Check permissions at the edge**: Verify permissions as early as possible in your request flow
4. **Store short codes**: If persisting permissions, store the short codes to save space
5. **Combine with session**: Use together with session module for a complete auth solution

## Multiton Example

For multiple ACL instances (e.g., different permission systems):

```ts
import { ACL } from "@dokuzbit/utils/server";

const mainAcl = new ACL();
const adminAcl = new ACL();

// Each instance has its own permission cache and can be used independently
const mainPerms = mainAcl.buildShortList(user, mainRoles);
const adminPerms = adminAcl.buildShortList(admin, adminRoles);
```

## Notes

- Permission strings are case-sensitive
- Attributes in permissions are automatically sorted for consistency
- Empty or null inputs are handled gracefully (return `[]` or `false`)
- The system is designed to be fail-safe: if in doubt, it denies access

