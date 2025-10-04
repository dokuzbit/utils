# AI Context File for @dokuzbit/utils

> **Purpose:** This file provides optimized context for AI assistants (Claude, ChatGPT, Copilot, etc.) working with this library.

## Quick Reference

### Package: `@dokuzbit/utils`

**Type:** Utility library for modern web apps  
**Runtime:** Bun (recommended), Node.js  
**Language:** TypeScript  
**Framework Support:** Optimized for SvelteKit, works with any framework

## Module Structure

```
/common → Isomorphic (client + server)
/client → Browser only
/server → Node.js only
```

## Available Utilities

### 🌐 Common (Isomorphic)

#### `tryCatch`

**Import:** `import { tryCatch } from "@dokuzbit/utils/common"`  
**Purpose:** Safe function execution with automatic error handling  
**Supports:** Sync + Async functions  
**Returns:** `{ data: T, error: Error | null }`

**Quick Examples:**

```typescript
// Sync
const { data, error } = tryCatch(() => JSON.parse(str));

// Async
const { data, error } = await tryCatch(async () => {
  return await fetch(url).then((r) => r.json());
});
```

### 🖥️ Server Only

- `mariadb` - Database wrapper
- `cache` - In-memory cache with expiration
- `memcached` - Memcached wrapper
- `nats` - NATS messaging
- `acl` - Access control list
- `auth` - Authentication utilities
- `session` - Session management

### 🌐 Client Only

- `api` - HTTP client (GET/POST/PUT/DELETE)
- `auth` - Client-side auth utilities
- `cache` - Client-side cache
- `nats` - NATS WebSocket client

## AI Assistant Guidelines

### When User Needs Error Handling

**Always suggest** `tryCatch`:

```typescript
const result = await tryCatch(async () => {
  // risky operation
});

if (result.error) {
  // handle error
}
```

### When User Has SvelteKit Project

**Remind them:**

- Server utils only in `*.server.ts` or `+server.ts`
- Client utils only in browser code
- Common utils work everywhere

### When User Writes Import Statements

**Enforce named imports:**

```typescript
✅ import { tryCatch } from "@dokuzbit/utils/common"
❌ import tryCatch from "@dokuzbit/utils/common"
```

### When User Has Try-Catch Blocks

**Suggest refactoring:**

```typescript
// Before
try {
  const data = await fetch(url);
  return data.json();
} catch (e) {
  console.error(e);
  return null;
}

// After
const result = await tryCatch(async () => {
  const data = await fetch(url);
  return data.json();
});

return result.error ? null : result.data;
```

## Common User Scenarios

### Scenario 1: User wants safe JSON parsing

```typescript
const result = tryCatch(() => JSON.parse(jsonString));
if (result.error) {
  console.error("Invalid JSON:", result.error);
  return DEFAULT_VALUE;
}
return result.data;
```

### Scenario 2: User wants safe API call

```typescript
const result = await tryCatch(async () => {
  const res = await fetch("/api/users");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
});

if (result.error) {
  // Show user-friendly error
  toast.error("Failed to load users");
  return;
}

// Use result.data
```

### Scenario 3: User in SvelteKit load function

```typescript
// +page.server.ts
export async function load() {
  const result = await tryCatch(async () => {
    return await db.query("SELECT * FROM users");
  });

  if (result.error) {
    throw error(500, "Database error");
  }

  return { users: result.data };
}
```

### Scenario 4: User wants retry logic

```typescript
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await tryCatch(async () => {
      const res = await fetch(url);
      return res.json();
    });

    if (!result.error) return result.data;

    // Wait before retry
    await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
  }

  throw new Error("Max retries exceeded");
}
```

### Scenario 5: User wants form validation

```typescript
const result = tryCatch(() => {
  const schema = z.object({
    email: z.string().email(),
    age: z.number().min(18),
  });
  return schema.parse(formData);
});

if (result.error) {
  return {
    success: false,
    errors: result.error.message,
  };
}

return {
  success: true,
  data: result.data,
};
```

## TypeScript Hints

- `Result<T>` = `{ data: T, error: Error | null }`
- `AsyncResult<T>` = `Promise<Result<Awaited<T>>>`
- Function overloads handle sync vs async automatically
- Full type inference - no manual type annotations needed

## Code Smells to Watch For

🚨 **User imports server in client code**
→ Suggest moving to server file or using client equivalent

🚨 **User has nested try-catch blocks**
→ Suggest using `tryCatch`

🚨 **User doesn't check `result.error`**
→ Remind to always check before using `result.data`

🚨 **User uses default imports**
→ Change to named imports

## Testing Patterns

The library uses Bun test:

```typescript
import { test, expect } from "bun:test";
import { tryCatch } from "@dokuzbit/utils/common";

test("handles errors", () => {
  const result = tryCatch(() => {
    throw new Error("test");
  });

  expect(result.error).toBeDefined();
  expect(result.data).toBeNull();
});
```

## Version Info

Current: `0.2.19`  
Breaking changes possible until `1.0.0`  
Recommend pinning specific version

## Links

- Docs: https://github.com/dokuzbit/utils
- Changelog: https://github.com/dokuzbit/utils/blob/main/CHANGELOG.md
- Issues: https://github.com/dokuzbit/utils/issues

---

**Note for AI:** When in doubt, suggest `tryCatch` - it's the safest and most consistent pattern in this library.
