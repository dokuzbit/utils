# @dokuzbit/utils

Utility functions for web applications, both server and client side.  
This library is designed for modern web apps mostly considering crm/erp systems as an private internal library. Later we decided to make it public. The library is very performant and uses native methods. But because it's tailored for internal use it may not be suitable for all cases. So I encoruge you to use it with specific tag (version) to avoid breaking changes. Please consider fallowing issues before using:

- There may be breaking changes in the future, until release 1.0.0.
- The documentation is not complete yet.
- The syntax of the fucntions may be different then common use as it's tailored for internal use.

## Installation

You can install the library using your favorite package manager, but yes we 💜 bun.

```bash
bun install @dokuzbit/utils
```

## Package Structure

This package is organized into three main modules:

- **`/common`** - Isomorphic utilities that work in both client and server environments
- **`/client`** - Browser-only utilities
- **`/server`** - Server-only utilities (Node.js)

This separation ensures optimal bundle sizes and prevents server code from being included in client bundles.

## Usage Example

```ts
// Common utilities (works everywhere)
import { tryCatch } from "@dokuzbit/utils/common";

// Client-side utilities
import { api } from "@dokuzbit/utils/client";

// Server-side utilities
import { mariadb } from "@dokuzbit/utils/server";
```

### Singleton Pattern

We recommend using singleton pattern for server utilities as documented below. However if you want to use multiton (aka multiple instances) you can import the class directly. Explained [here](https://github.com/dokuzbit/utils/blob/main/docs/common.md#multiton-pattern)

```ts
import db from "@dokuzbit/utils/server/mariadb";
```

## Common Utilities Documentation

Common utilities are isomorphic and can be used in both client and server environments.

- [tryCatch](https://github.com/dokuzbit/utils/blob/main/docs/common/tryCatch.md) - safe function execution with error handling

### tryCatch

Safe function execution with automatic error handling. Supports both synchronous and asynchronous functions.

```ts
import { tryCatch, type Result } from "@dokuzbit/utils/common";

// Synchronous usage
const result = tryCatch(() => JSON.parse(jsonString));
if (result.error) {
  console.error("Parse failed:", result.error);
} else {
  console.log("Data:", result.data);
}

// Asynchronous usage
const asyncResult = await tryCatch(async () => {
  const response = await fetch("/api/data");
  return response.json();
});
if (asyncResult.error) {
  console.error("Fetch failed:", asyncResult.error);
} else {
  console.log("Data:", asyncResult.data);
}
```

**Returns:** `Result<T>` object with `{ data: T, error: Error | null }`

---

Please read this [Common Information](https://github.com/dokuzbit/utils/blob/main/docs/common.md) about the library documenting how to install, how to import, how to use singleton and multiton patterns.

## Server Side Documentation

- [acl](https://github.com/dokuzbit/utils/blob/main/docs/server/acl.md) - access control list for authorization (DOCS NOT READY)
- [auth](https://github.com/dokuzbit/utils/blob/main/docs/server/auth.md) - 3rd party authentication utilities (METHOD NOT READY YET)
- [cache](https://github.com/dokuzbit/utils/blob/main/docs/server/cache.md) - in memory cache with expiration
- [mariadb](https://github.com/dokuzbit/utils/blob/main/docs/server/mariadb.md) - database wrapper for mariadb
- [memcached](https://github.com/dokuzbit/utils/blob/main/docs/server/memcached.md) - memcached wrapper with fallback (DOCS NOT READY)
- [nats](https://github.com/dokuzbit/utils/blob/main/docs/server/nats.md) - nats wrapper
- [session](https://github.com/dokuzbit/utils/blob/main/docs/server/session.md) - session management utility (DOCS NOT READY)

## Client Side Documentation

- [api](https://github.com/dokuzbit/utils/blob/main/docs/client/api.md) - api library for get/post/put/delete requests
- [auth](https://github.com/dokuzbit/utils/blob/main/docs/client/auth.md) - 3rd party authentication utilities for client side (DOCS NOT READY)
- [cache](https://github.com/dokuzbit/utils/blob/main/docs/client/cache.md) - in memory cache with expiration (DOCS NOT READY)

---

### Why three separate modules (common, client, server)?

This structure provides several benefits:

1. **Bundle Size Optimization**: Only import what you need. Client bundles don't include server code.
2. **Security**: Server-side code (database credentials, API keys) never leaks to the client bundle.
3. **Framework Support**: In SvelteKit (we 💜 Svelte), you cannot import server utilities in client-side code, preventing accidental data leaks.
4. **Tree-shaking**: Modern bundlers can eliminate unused code more effectively.
5. **Clear Intent**: Code organization makes it obvious where utilities can be used.

The `.server.ts` extension in file names further helps SvelteKit identify server-only modules.

---

## 🤖 AI Assistant Integration

This library includes special context files optimized for AI assistants to provide better suggestions.

### Quick Setup (Recommended)

After installing the package, run:

```bash
npx dokuzbit-setup-ai
```

This will copy AI context files to your project root:

- `.cursorrules` - Auto-detected by Cursor AI
- `AI_CONTEXT.md` - For Claude, ChatGPT, and other AI assistants

### Manual Setup

#### For Cursor AI Users

Cursor automatically detects `.cursorrules` in your project or node_modules. No action needed!

#### For Claude / ChatGPT Users

Copy the context file to your project:

```bash
cp node_modules/@dokuzbit/utils/AI_CONTEXT.md .
```

Then share it with your AI assistant:

```
"Read the AI_CONTEXT.md file and help me use @dokuzbit/utils"
```

#### View Online

You can also view these files on [GitHub](https://github.com/dokuzbit/utils):

- [AI_CONTEXT.md](https://github.com/dokuzbit/utils/blob/main/AI_CONTEXT.md)
- [.cursorrules](https://github.com/dokuzbit/utils/blob/main/.cursorrules)

---

## 📋 Changelog

For a detailed list of changes in each version, see our [CHANGELOG.md](./CHANGELOG.md).
