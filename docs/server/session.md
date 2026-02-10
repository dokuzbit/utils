# session - JWT-based Session Manager

## Installation

[Installation](../common.md#installation), [Singleton Pattern](../common.md#singleton-pattern), [Multiton Pattern](../common.md#multiton-pattern) and [Default Import](../common.md#default-import) is documented in [here](../common.md)

```ts
import { session } from "@dokuzbit/utils/server";
// or
import sessionManager from "@dokuzbit/utils/server/session";
// ☝️ We export the singleton instance as default for easy aliasing
```

### hooks.server.ts - Global session setup (Safe way)

To avoid session mixing in concurrent requests, use the `session.handle()` middleware. This ensures that each request has its own isolated session context even when using the singleton instance.

```ts
import { session } from "@dokuzbit/utils/server";

export const handle = session.handle({
  secret: process.env.JWT_SECRET,
  expiresIn: "30m",
});

// Or if you have other handles:
// export const handle = sequence(session.handle(), ...);
```

### session.run(config, callback) - Scoped execution

If you need to run a block of code with a specific session configuration (useful in tests or background jobs):

```ts
await session.run({ cookies: myMockCookies }, async () => {
  const result = await session.getToken();
  // ...
});
```

## .config(options) - Configure session settings

- options: `object` - The configuration object for the session settings.
  - cookies?: `Cookies` - The cookies object from SvelteKit or other framework
  - cookieName?: `string` - The name of the session cookie (default: 'session_cookie')
  - secret?: `string` - JWT secret key (default: process.env.JWT_SECRET or 'secret')
  - expiresIn?: `string | number` - JWT expiration time (default: '15m' or '1m' in debug mode)
  - path?: `string` - Cookie path (default: '/')
  - httpOnly?: `boolean` - HTTP only cookie flag (default: true)
  - secure?: `boolean` - Secure cookie flag (default: true in production)
  - maxAge?: `number` - Cookie max age in milliseconds (default: 365 days)
- returns: `Session` - Returns the session instance for chaining.

> **Warning**: When using the singleton `session` instance, calling `.config()` outside of a `session.handle()` or `session.run()` context can lead to race conditions in concurrent environments. Always prefer using the `handle()` middleware in SvelteKit.

## .setToken(data, options?) - Create and store session token

- data: `any` - The payload data to be encoded into the JWT
- options?: `object` - Optional override settings
  - cookieName?: `string` - Override default cookie name
  - expiresIn?: `string` - Override default expiration time
  - path?: `string` - Override cookie path
  - httpOnly?: `boolean` - Override HTTP only flag
  - secure?: `boolean` - Override secure flag
  - maxAge?: `number` - Override cookie max age
- returns: `Promise<PayloadInterface>` - The created token payload with metadata

```ts
// Basic usage
const result = await session.setToken({ userId: 123, role: "admin" });
console.log(result); // { payload: { userId: 123, role: 'admin' }, expired: false, error: null, exp: 1234567890, iat: 1234567890 }

// With custom expiration
await session.setToken({ userId: 123 }, { expiresIn: "1h" });
```

## .getToken(cookieName?, callback?, nocache?) - Retrieve and verify session token

- cookieName?: `string` - Optional cookie name to retrieve (uses default if not specified)
- callback?: `function | boolean` - Optional callback or boolean for token refresh behavior:
  - `false` or `undefined`: Return expired status without refresh
  - `true`: Always refresh expired tokens automatically
  - `function`: Custom callback that receives payload and returns new payload or boolean
- nocache?: `boolean` - Skip cache and force token verification (default: false)
- returns: `Promise<PayloadInterface>` - The payload with metadata

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
- returns: `Promise<PayloadInterface>` - The updated token payload

```ts
// Update user role in existing session
const result = await session.updateToken({ role: "admin" });
// ☝️ Merges new data with existing payload using deep merge
```

## .clearToken(cookieName?, cookiePath?) - Clear token data but keep cookie

- cookieName?: `string` - Optional cookie name (uses default if not specified)
- cookiePath?: `string` - Optional cookie path (uses default if not specified)
- returns: `Promise<boolean>` - Always returns true

```ts
// Clear session data
await session.clearToken();
// ☝️ Sets token to empty object, keeps cookie structure
```

## .deleteToken(cookieName?, cookiePath?) - Completely remove session cookie

- cookieName?: `string` - Optional cookie name (uses default if not specified)
- cookiePath?: `string` - Optional cookie path (uses default if not specified)
- returns: `Promise<boolean>` - Always returns true

```ts
// Logout - completely remove session
await session.deleteToken();
```

## PayloadInterface

The return type for session operations:

```ts
interface PayloadInterface {
  payload: any; // Your session data
  expired: boolean; // Whether token is expired
  error: Error | null | string; // Error message if any
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
}
```

## Example Usage in SvelteKit

### hooks.server.ts - Global session setup

```ts
import { session } from "@dokuzbit/utils/server";

// Using the handle helper is the safest way to avoid session mixing
export const handle = session.handle({
  secret: process.env.JWT_SECRET,
  expiresIn: "30m",
});

// If you need to access session data in the handle itself:
/*
export async function handle({ event, resolve }) {
  return session.run({ cookies: event.cookies }, async () => {
    // Auto-refresh expired tokens
    const result = await session.getToken(undefined, true);
    event.locals.user = result.expired || result.error ? null : result.payload;
    return resolve(event);
  });
}
*/
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
  login: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get("email");
    const password = data.get("password");

    // Verify credentials (example)
    const user = await db.query("SELECT * FROM users WHERE email = ? LIMIT 1", [
      email,
    ]);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return { success: false, error: "Invalid credentials" };
    }

    // Create session
    session.config({ cookies });
    await session.setToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    throw redirect(303, "/dashboard");
  },

  logout: async ({ cookies }) => {
    session.config({ cookies });
    await session.deleteToken();
    throw redirect(303, "/");
  },
};
```

### +page.server.ts - Protected route

```ts
import { session } from "@dokuzbit/utils/server";
import { redirect } from "@sveltejs/kit";

export async function load({ cookies }) {
  session.config({ cookies });

  const result = await session.getToken(undefined, async (payload) => {
    // Refresh with latest user data
    const user = await db.query("SELECT * FROM users WHERE id = ? LIMIT 1", [
      payload.userId,
    ]);

    if (!user) return false; // User deleted, don't refresh
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

export async function GET({ cookies }) {
  session.config({ cookies });

  const result = await session.getToken();

  if (result.error || result.expired) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use session data
  const data = await fetchUserData(result.payload.userId);

  return json(data);
}
```

## Features

- **JWT-based**: Uses JSON Web Tokens for stateless sessions
- **Auto-caching**: Integrates with cache module for better performance
- **Flexible refresh**: Multiple strategies for handling expired tokens
- **Deep merge**: Updates preserve nested object structure
- **SvelteKit optimized**: Designed to work seamlessly with SvelteKit cookies API
- **Type-safe**: Full TypeScript support with proper type inference

## Multiton Example

We recommend using singleton pattern as documented above. However if you want to use multiton (aka multiple instances) you can import Session class directly. Here is an example:

```ts
import { Session } from "@dokuzbit/utils/server";

const userSession = new Session();
const adminSession = new Session();

userSession.config({
  cookies: event.cookies,
  cookieName: "user_session",
  expiresIn: "30m",
});

adminSession.config({
  cookies: event.cookies,
  cookieName: "admin_session",
  expiresIn: "1h",
});
```
