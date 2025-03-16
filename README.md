# @dokuzbit/utils

Utility functions for web applications, both server and client side. (**Note:** db stands for dokuzbit not database)  
This library is designed for modern web apps mostly considering crm/erp systems as an private internal library. Later we decided to make it public. The library is very performant and uses native methods. But because it's tailored for internal use it may not be suitable for all cases. So I encoruge you to use it with specific tag (version) to avoid breaking changes. Please consider fallowing issues before using:

- There may be breaking changes in the future, until release 1.0.0.
- The documentation is not complete yet.
- The syntax of the fucntions may be different then common use as it's tailored for internal use.

## Installation

```bash
bun add @dokuzbit/utils
```

```bash
npm install @dokuzbit/utils
```

```bash
pnpm add @dokuzbit/utils
```

## Usage Example

```ts
import { mariadb } from "@dokuzbit/utils/server";
import { mariadb } from "@dokuzbit/utils/server/mariadb";
import { api } from "@dokuzbit/utils/client";
```

## Server Side Documentation

- [acl](https://github.com/dokuzbit/utils/blob/main/docs/server/acl.md) - access control list for authorization (**Note:** docs not ready yet)
- [auth](https://github.com/dokuzbit/utils/blob/main/docs/server/auth.md) - 3rd party authentication utilities (**Note:** method not ready yet)
- [cache](https://github.com/dokuzbit/utils/blob/main/docs/server/cache.md) - in memory cache with expiration (**Note:** docs not ready yet)
- [mariadb](https://github.com/dokuzbit/utils/blob/main/docs/server/mariadb.md) - database wrapper for mariadb
- [memcached](https://github.com/dokuzbit/utils/blob/main/docs/server/memcached.md) - memcached wrapper with fallback (**Note:** docs not ready yet)
- [nats](https://github.com/dokuzbit/utils/blob/main/docs/server/nats.md) - nats wrapper (**Note:** docs not ready yet)
- [session](https://github.com/dokuzbit/utils/blob/main/docs/server/session.md) - session management utility (**Note:** docs not ready yet)

## Client Side Documentation

- [api](https://github.com/dokuzbit/utils/blob/main/docs/client/api.md) - api library for get/post/put/delete requests
- [auth](https://github.com/dokuzbit/utils/blob/main/docs/client/auth.md) - 3rd party authentication utilities for client side (**Note:** docs not ready yet)
- [cache](https://github.com/dokuzbit/utils/blob/main/docs/client/cache.md) - in memory cache with expiration (**Note:** docs not ready yet)

---

### Why two folders for client and server and why server utilites named with .server.ts?

In sveltekit (our beloved JS metaframework) you cannot import server side utilities in client side ending up with error.  
So we put server side utilities in `server` folder with `.server.ts` extension and client side utilities in `client` folder.
