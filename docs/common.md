# Common information about the library

## Installation

You can install the library using your favorite package manager, but yes we 💜 bun.

```bash
bun install @dokuzbit/utils
```

## Singleton Pattern

We recommend using singleton pattern as documented below. However if you want to use multiton (aka multiple instances) you can import the class directly. Example [here](#multiton-pattern)

```ts
import { api } from "@dokuzbit/utils/client";
import { mariadb } from "@dokuzbit/utils/server";
```

## Default Import

We export the singleton instance as default, so you can import it as follows:

```ts
import data from "@dokuzbit/utils/client/api";
import db from "@dokuzbit/utils/server/mariadb";
```

## Multiton Pattern

We recommend using singleton pattern as documented above. However if you want to use multiton (aka multiple instances) you can import the class directly. Keep in mind that some classes have cache functionality and multiple instances will use different cache instances. So be careful when using multiton pattern and mostly avoid using it. Use it only if you know what you are doing.

```ts
import { Api } from "@dokuzbit/utils/client/api";
const api1 = new Api();
const api2 = new Api();
```

Most of the classes support constructor parameters. You can configure at initilazition time or later.

```ts
import { Api } from "@dokuzbit/utils/client/api";
const baseUrl = "https://jsonplaceholder.typicode.com/";
const api1 = new Api(baseUrl);
// or
const api2 = new Api();
api2.setBaseUrl(baseUrl);
```

```ts
import { MariaDB } from "@dokuzbit/utils/server/mariadb";
const config = {
  host: "localhost",
  user: "root",
  password: "password",
  database: "test",
};
const db1 = new MariaDB(config);
const db2 = new MariaDB();
db2.config(config);
```
