# session - JWT-based Session Manager

## Installation

[Installation](../common.md#installation), [Singleton Pattern](../common.md#singleton-pattern), [Multiton Pattern](../common.md#multiton-pattern) and [Default Import](../common.md#default-import) is documented in [here](../common.md)

```ts
import { session } from "@dokuzbit/utils/server";
// or
import sessionManager from "@dokuzbit/utils/server/session";
// ☝️ We export the singleton instance as default for easy aliasing
```

### hooks.server.ts - Global session setup

Use `session.init()` in your hooks file. This creates an isolated session context per request using `AsyncLocalStorage`, preventing session leaks between concurrent users.

```ts
import { session } from "@dokuzbit/utils/server";

export const handle = session.init({
  secret: process.env.JWT_SECRET,
  expiresIn: "30m",
});

// With other handles:
// export const handle = sequence(session.init({ ... }), otherHandle);
```

After `init()`, you can use `session.getToken()`, `session.setToken()`, etc. in any `+page.server.ts`, `+server.ts`, or subsequent handle without any additional setup.

### session.run(config, callback) - Scoped execution

For tests or non-SvelteKit environments (background jobs, Express, Hono, etc.):

```ts
await session.run({ cookies: myMockCookies }, async () => {
  const result = await session.getToken();
  // ...
});
```

## .setToken(data, options?) - Create and store session token

- data: `any` - The payload data to be encoded into the JWT
- options?: `object` - Optional override settings
  - cookieName?: `string` - Override default cookie name
  - expiresIn?: `string` - Override default expiration time
  - path?: `string` - Override cookie path
  - httpOnly?: `boolean` - Override HTTP only flag
  - secure?: `boolean` - Override secure flag
  - maxAge?: `number` - Override cookie max age
- returns: `PayloadInterface` - The created token payload with metadata

```ts
// Basic usage
const result = session.setToken({ userId: 123, role: "admin" });
console.log(result); // { payload: { userId: 123, role: 'admin' }, expired: false, error: null, exp: 1234567890, iat: 1234567890 }

// With custom expiration
session.setToken({ userId: 123 }, { expiresIn: "1h" });
```

## .getToken(cookieName?, callback?) - Retrieve and verify session token

- cookieName?: `string` - Optional cookie name to retrieve (uses default if not specified)
- callback?: `function | boolean` - Optional callback or boolean for token refresh behavior:
  - `false` or `undefined`: Return expired status without refresh
  - `true`: Always refresh expired tokens automatically
  - `function`: Custom callback that receives payload and returns new payload or boolean
- returns: `Promise<PayloadInterface<T>>` - The payload with metadata (supports generics)

```ts
// Basic usage - get current token
const result = await session.getToken();
if (result.error) {
  console.log("Not authenticated");
} else if (result.expired) {
  console.log("Token expired");
} else {
  console.log("User:", result.payload.userId);
}

// With generic type
const result = await session.getToken<{ userId: number; role: string }>();
// result.payload is typed as { userId: number; role: string }

// Auto-refresh expired tokens
const result = await session.getToken(undefined, true);
// ☝️ If expired, automatically creates new token with same payload

// Custom refresh logic
const result = await session.getToken(undefined, async (oldPayload) => {
  // Verify user still exists in database
  const user = await db.query("SELECT * FROM users WHERE id = ? LIMIT 1", [
    oldPayload.userId,
  ]);
  if (!user) return false; // Don't refresh, user doesn't exist

  // Update payload with fresh data
  return { userId: user.id, role: user.role };
});
```

## .updateToken(newPayload) - Update existing token with new data

- newPayload: `any` - New data to merge with existing payload
- returns: `Promise<PayloadInterface>` - The updated token payload, or error if no valid token exists

```ts
// Update user role in existing session
const result = await session.updateToken({ role: "admin" });
// ☝️ Merges new data with existing payload using deep merge
```

## .clearToken(cookieName?, cookiePath?) - Clear token data but keep cookie

- cookieName?: `string` - Optional cookie name (uses default if not specified)
- cookiePath?: `string` - Optional cookie path (uses default if not specified)
- returns: `PayloadInterface` - The cleared token payload

```ts
// Clear session data
session.clearToken();
// ☝️ Sets token to empty object, keeps cookie structure
```

## .deleteToken(cookieName?, cookiePath?) - Completely remove session cookie

- cookieName?: `string` - Optional cookie name (uses default if not specified)
- cookiePath?: `string` - Optional cookie path (uses default if not specified)
- returns: `boolean` - Always returns true

```ts
// Logout - completely remove session
session.deleteToken();
```

## PayloadInterface

The return type for session operations:

```ts
interface PayloadInterface<T = any> {
  payload: T; // Your session data
  expired: boolean; // Whether token is expired
  error: string | null; // Error message if any
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
}
```

## Example Usage in SvelteKit

### hooks.server.ts - Global session setup

```ts
import { session } from "@dokuzbit/utils/server";
import { sequence } from "@sveltejs/kit/hooks";

// init() creates an isolated context per request
export const handle = sequence(
  session.init({
    secret: process.env.JWT_SECRET,
    expiresIn: "30m",
  }),
  async ({ event, resolve }) => {
    // This runs inside the isolated session context
    const result = await session.getToken(undefined, true);
    event.locals.user = result.expired || result.error ? null : result.payload;
    return resolve(event);
  }
);
```

### +page.server.ts - Login endpoint

```ts
import { session } from "@dokuzbit/utils/server";
import { redirect } from "@sveltejs/kit";

export async function load({ locals }) {
  if (locals.user) {
    throw redirect(303, "/dashboard");
  }
}

export const actions = {
  login: async ({ request }) => {
    const data = await request.formData();
    const email = data.get("email");
    const password = data.get("password");

    const user = await db.query("SELECT * FROM users WHERE email = ? LIMIT 1", [
      email,
    ]);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return { success: false, error: "Invalid credentials" };
    }

    // No config needed - init() already set up the context
    session.setToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    throw redirect(303, "/dashboard");
  },

  logout: async () => {
    session.deleteToken();
    throw redirect(303, "/");
  },
};
```

### +page.server.ts - Protected route

```ts
import { session } from "@dokuzbit/utils/server";
import { redirect } from "@sveltejs/kit";

export async function load() {
  const result = await session.getToken(undefined, async (payload) => {
    const user = await db.query("SELECT * FROM users WHERE id = ? LIMIT 1", [
      payload.userId,
    ]);

    if (!user) return false;
    return { userId: user.id, email: user.email, role: user.role };
  });

  if (result.error || result.expired) {
    throw redirect(303, "/login");
  }

  return {
    user: result.payload,
  };
}
```

### +server.ts - API endpoint

```ts
import { session } from "@dokuzbit/utils/server";
import { json } from "@sveltejs/kit";

export async function GET() {
  const result = await session.getToken();

  if (result.error || result.expired) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await fetchUserData(result.payload.userId);
  return json(data);
}
```

## Features

- **JWT-based**: Uses JSON Web Tokens for stateless sessions
- **Request isolation**: Uses `AsyncLocalStorage` to prevent session leaks between concurrent requests
- **Framework agnostic**: Works with SvelteKit, Express, Hono, Fastify, or any Node.js framework
- **Flexible refresh**: Multiple strategies for handling expired tokens
- **Deep merge**: Updates preserve nested object structure with prototype pollution protection
- **Type-safe**: Full TypeScript support with generic `PayloadInterface<T>`
