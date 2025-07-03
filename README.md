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

## Usage Example

We recommend using singleton pattern as documented below. However if you want to use multiton (aka multiple instances) you can import the class directly. Explained [here](https://github.com/dokuzbit/utils/blob/main/docs/common.md#multiton-pattern)

```ts
import { api } from '@dokuzbit/utils/client';
import { mariadb } from '@dokuzbit/utils/server';
```

## Default Import

We export the singleton instance as default, so you can import it as follows:

```ts
import data from '@dokuzbit/utils/client/api';
import db from '@dokuzbit/utils/server/mariadb';
```

## Common Information

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

### Why two folders for client and server and why server utilites named with .server.ts?

In sveltekit (we 💜 svelte) you cannot import server side utilities in client side ending up with error to protect missuse of server side utilities in client side which protects data leaks. So we put server side utilities in `server` folder with `.server.ts` extension and client side utilities in `client` folder.

---

## 📋 Changelog

For a detailed list of changes in each version, see our [CHANGELOG.md](./CHANGELOG.md).
