# @dokuzbit/utils

Utility functions for web applications, both server and client side. (**Note:** db stands for dokuzbit not database)  
This library is designed for modern web apps mostly considering crm/erp systems as an private internal library. Later we decided to make it public. The library is very performant and uses native methods. But because it's tailored for internal use it may not be suitable for all cases. So I encoruge you to use it with specific tag (version) to avoid breaking changes. Please consider fallowing issues before using:

- There may be breaking changes in the future, until release 1.0.0.
- The documentation is not complete yet.
- The syntax of the fucntions may be different then common use as it's tailored for internal use.

## Usage Example

```ts
import { mariadb } from "@dokuzbit/utils/server";
import { mariadb } from "@dokuzbit/utils/server/mariadb";
import { api } from "@dokuzbit/utils/client";
```

## Server Side

- [acl](./docs/server/acl.md) - access control list for authorization
- [auth](./docs/server/auth.md) - 3rd party authentication utilities \*\*\* **not finished yet**
- [cache](./docs/server/cache.md) - in memory cache with expiration
- [mariadb](./docs/server/mariadb.md) - database wrapper for mariadb
- [memcached](./docs/server/memcached.md) - memcached wrapper with fallback
- [nats](./docs/server/nats.md) - nats wrapper
- [session](./docs/server/session.md) - session management utility

## Client Side

- [api](./docs/client/api.md) - api library for get/post/put/delete requests
- [auth](./docs/client/auth.md) - 3rd party authentication utilities for client side \*\*\* **not finished yet**
- [cache](./docs/client/cache.md) - in memory cache with expiration

---

### Why two folders for client and server and why server utilites named with .server.ts?

In sveltekit (our beloved JS metaframework) you cannot import server side utilities in client side ending up with error.  
So we put server side utilities in `server` folder with `.server.ts` extension and client side utilities in `client` folder.
