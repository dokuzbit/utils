# mariadb - Database Wrapper for MariaDB

## Installation

[Installation](../common.md#installation), [Singleton Pattern](../common.md#singleton-pattern), [Multiton Pattern](../common.md#multiton-pattern) and [Default Import](../common.md#default-import) is documented in [here](../common.md)

```ts
import { MariaDB } from "@dokuzbit/utils/server";
const mariadb = new MariaDB;
// or
import db from "@dokuzbit/utils/server/mariadb"; 
// ☝️ We export the singleton instance as default for easy aliasing
```

## .config(config) - Initialize the database connection

- config: `object` - The configuration object for the database connection.
  - host: `string` - The host to connect to.
  - user: `string` - The user to connect to the database with.
  - password: `string` - The password to connect to the database with.
  - database: `string` - The database to connect to.

```ts
const config = {
  host: "localhost",
  user: "root",
  password: "password",
  database: "test",
};
mariadb.config(config);
```

## .query(sql, params) - Simple select query

- sql: `string` - The SQL query to execute with ? or :id (named placeholders)  
  _example:_ 'SELECT _ FROM users where id = ?' or 'SELECT _ FROM users where id = :id'
- params: `array` | `object` - array of values for ordered placeholders or object for named placeholders
  _example:_ `[1]` or `{ id: 1 }`
- returns: `object` | `array` | `any` | `{error: any}` - return array / object / value / {error: any} depending on the query (see below)

```ts
// you can use ? or :id (named placeholders) to bind the values, both will work the same
const result = await mariadb.query("SELECT * FROM users where id = ?", [ 1 ]);
const result = await mariadb.query("SELECT * FROM users where id = :id", { id: 1 });
// result = [{ id: 1, name: 'John', email: 'john@example.com' },{ id: 2, name: 'Jane', email: 'jane@example.com' }]

// adding limit 1 to the query will return a single object instead of an array
const result = await mariadb.query("SELECT * FROM users where id = ? limit 1", [ id ]);
// result = { id: 1, name: 'John', email: 'john@example.com' }

// adding limit 1 to the single column query will return a single value instead of an object
const result = await mariadb.query("SELECT name FROM users where id = ? limit 1", [ id ]);
// result = 'John'

// you can use colon notation to get json values
const result = await mariadb.query("SELECT data:color,data:size FROM users where data:contact.phone = ?", [ phone ]);
// result = { color: 'red', size: 'M' }

// errror handling is supported by flat object syntax
const result = await mariadb.query("SELECT * FROM WRONG_TABLE where id = ?", [ 1 ]);
if('error' in result) console.log(result.error.code); // 'ER_NO_SUCH_TABLE'
```

## .objectUpdate({table, values, whereField}) - Update table with JS Object

- table: `string` - The table to update. _example:_ `'users'`
- values: `object` | `array` - object for single record or array of objects for multiple records update.  
  _example:_ `{ id: 1, name: 'John' }` or `[{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]`
- whereField (optional): `string` - The field to use for the where clause, defaults to 'id'
  _example:_ `'id'`
- returns: `object` - standart mysql result object. _example:_ `{ affectedRows: 1, insertId: 1, warningStatus: 0 }`

```ts
// Single Record:this will update the user with id 1 to have the name John. You can omit whereField if whereField is id as it's the default
const result = await mariadb.objectUpdate({
  table: "users",
  values: { id: 1, name: "John" },
  whereField: "id",
});
const result = await mariadb.objectUpdate({
  table: "users",
  values: { id: 1, name: "John" },
});

// Multiple Records: this will update the users with id 1 and 2 to have the name John and Jane respectively
const result = await db.objectUpdate({
  table: "users",
  values: [
    { id: 1, name: "John" },
    { id: 2, name: "Jane" },
  ],
  whereField: "id",
});
```

## .insert({table, values}) - Insert a single record or multiple records into a table

- table: `string` - The table to insert the record into. _example:_ `'users'`
- values: `object` | `array` - object for single record or array of objects for multiple records insert.  
  _example:_ `{ name: 'John', email: 'john@example.com' }` or `[{ name: 'John', email: 'john@example.com' }, { name: 'Jane', email: 'jane@example.com' }]`
- returns: `object` - standart mysql result object. _example:_ `{ affectedRows: 1, insertId: 1, warningStatus: 0 }`

```ts
const result = await db.insert("users", {
  name: "John",
  email: "john@example.com",
});
// Single Record: this will insert a single record into the users table
const result = await db.insert("users", [
  { name: "John", email: "john@example.com" },
  { name: "Jane", email: "jane@example.com" },
]);
// Multiple Records: this will insert multiple records into the users table
```

## .upsert({table, values, whereField}) - Insert or Update a single record or multiple records into a table

- table: `string` - The table to insert the record into. _example:_ `'users'`
- values: `object` | `array` - object for single record or array of objects for multiple records insert.  
  _example:_ `{ name: 'John', email: 'john@example.com' }` or `[{ name: 'John', email: 'john@example.com' }, { name: 'Jane', email: 'jane@example.com' }]`
- whereField (optional): `string` - The field to use for the where clause, defaults to 'id'
  _example:_ `'id'`

```ts
const result = await db.upsert(
  "users",
  { name: "John", email: "john@example.com" },
  { email: "john@example.com" }
);
// Single Record: this will update the users table if the email field already exists, otherwise it will insert a new record
const result = await db.upsert(
  "users",
  [
    { name: "John", email: "john@example.com" },
    { name: "Jane", email: "jane@example.com" },
  ],
  { email: "john@example.com" }
);
// Multiple Records: this will update the users table if the email field already exists, otherwise it will insert a new record
```

# Multiton Example

We recommend using singleton pattern as documented above. However if you want to use multiton (aka multiple instances) you can import MariaDB class directly. Here is an example:

```ts
import { MariaDB } from "@dokuzbit/utils/server";
const config = {
  host: "localhost",
  user: "root",
  password: "password",
  database: "test",
};
const db1 = new MariaDB(config);
const db2 = new MariaDB(config);
```
