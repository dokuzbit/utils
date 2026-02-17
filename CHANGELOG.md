# 📋 Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.3.4] - February 18, 2026

### 🔄 ☠️ Breaking Changes ☠️

- **session**: `config()` removed. Use `session.init()` in hooks and call `getToken/setToken` directly everywhere else.
- **session**: `handle()` renamed to `init()`.
- **session**: `setToken()`, `clearToken()`, `deleteToken()` are now synchronous (no longer return Promise).
- **session**: `PayloadInterface.error` type changed from `Error | null | string` to `string | null`.

#### Migration

```diff
 // hooks.server.ts
-export const handle = session.handle({ secret, cookieName });
+export const handle = session.init({ secret, cookieName });

 // +page.server.ts
-session.config({ cookies });
-await session.setToken({ userId: 1 });
+session.setToken({ userId: 1 });
 // ☝️ No config needed, init() already set up the context
```

### 🐛 Bug Fixes

- **session**: Fixed `secure: false` and `maxAge: 0` being ignored due to `||` operator (replaced with `??`)
- **session**: Fixed `callback === true` branch in `getToken` not stripping `exp/iat` before re-signing (caused jwt error)
- **session**: Fixed `updateToken` crashing when `getToken` returns an error (now returns error early)

### ✨ Added

- **session**: `PayloadInterface<T>` now supports generics for typed payloads
- **session**: `mergeDeep` now has prototype pollution protection (`__proto__`, `constructor`, `prototype` keys are filtered)

---

## [0.3.3] - December 16, 2025

### 🐛 Bug Fixes // !!! Security Vulnerability !!! /s

- Fixed a bug where the session cache was keyed only by cookie name, causing users on different devices to share sessions. The cache now keys by cookie name + cookie value.

## [0.3.2] - December 15, 2025

### 🐛 Bug Fixes // !!! Security Vulnerability !!! /s

- Fixed a bug where the session cache was keyed only by cookie name, causing users on different devices to share sessions. The cache now keys by cookie name + cookie value.

## [0.3.1] - December 14, 2025

### 🔄 Changed

- client/form formBuilder now accepts genmerge option to merge shcheme generated object with passed data
- client/form formBuilder now accepts generate option to generate object from schema. none | required | all (default: required)

## [0.3.0] - December 13, 2025

### 🔄 ☠️ Breaking Changes ☠️

- client/form formBuilder now accepts standart schema function as second parameter instead of schema object
- if schema is schema Object, isValid returns false and err object includes generalError: 'Schema is not a function.'
- if schema is not provided, isValid returns true
- isLoading property is removed
- allowEmptySubmit property is removed since it's better to use validation scheme instead

## [0.2.26] - December 12, 2025

### 🐛 Bug Fixes

- session.server.ts bugfix for getToken method. Fixes session loose after server restart. Was deleting cache before checking validation.

## [0.2.25] - December 4, 2025

### 🐛 Bug Fixes

- session.server.ts bugfix for setToken method. Fixes session loose after server restart.

### 🔄 Changed

- Add statusText and success properties to api response

## [0.2.24] - November 28, 2025

### 🔄 Changed

- nats config nıw supports reply header
- mariadb config now supports meta option

## [0.2.23] - October 10, 2025

### 🐛 Bug Fixes

- mariadb now support colon notation in query method ie: `select data:color from json_test where data:contact.phone = ?`
  0.2.22 bug fix which use dot notation which conflict with table alias

---

## [0.2.22] - October 10, 2025

### 🔄 Changed

- mariadb now support dot notation in query method ie: `select data.color from json_test where data.size = ?`
- mariadb now return { affectedRows: 0, error: any } instead of null if error occurs
- mariadb now return array when limit 1 is used but query has 'error' property to distunguish from real error object

## [0.2.21] - October 6, 2025

### 🔄 Changed

- /server/session now returns PayloadInterface instead of boolean and callback now returns PayloadInterface or boolean
  this means you can pass true or false or function as callback and this function can return PayloadInterface or boolean

---

## [0.2.20] - October 4, 2025

### ✨ Added

- client/api now removes cache if ttl is 0

---

## [0.2.19] - October 4, 2025

### ✨ Added

- Added `tryCatch` utility function in `common` module for safe function execution with error handling
- Added support for both synchronous and asynchronous functions in `tryCatch`
- Added `common` exports to package.json for isomorphic utilities

### 🔄 Changed

- Improved package.json exports structure with proper type definitions
- Removed default exports in favor of named exports for better tree-shaking
- Enhanced TypeScript types with `Result<T>` and `AsyncResult<T>` for better type safety

### 📚 Documentation

- Updated README with common utilities section
- Added comprehensive JSDoc comments with usage examples

---

## [0.2.18] - September 28, 2025

### 🔄 Changed

- if schema is prived and data is empty object {} or undefined formBuilder now returns default object with keys in schema and values according to schema

---

## [0.2.17] - September 28, 2025

### 🐛 Bug Fixes

- formBuildert validation is optional now, validate return null if schema is not provided
- cache.server.ts now returns null if node is not found

---

## [0.2.16] - September 28, 2025

### 🔄 Changed

- added arkType validation to formBuilder @client/form.ts

---

## [0.2.15] - September 22, 2025

### 🐛 Bug Fixes

- nats.ws package is used for client side instead of nats

---

## [0.2.14] - September 22, 2025

### 🐛 Bug Fixes

- client/nats.ts export'u client/index.ts'e eklendi

---

## [0.2.13] - September 22, 2025

### 🔄 Changed

- added client/nats.ts
- added nkey support to nats.server.ts

### 🐛 Bug Fixes

- nats.request throw error if response is not a valid JSON. Now it returns text or object depending on service response.

---

## [0.2.12] - July 17, 2025

### 🔄 Changed

- cache.server.ts now uses expireDate to keep cache data in sqlite database until expireDate.

---

## [0.2.11] - July 3, 2025

### 🔄 Changed

- objectUpdate and other methods also returns error object ({error:string}) instead of throwing error

### 🔒 Security

- now console.log error.sqlMessage but return error object ({error:string}) with error code for limited information. Otherwise sql statements can be exposed to the client.

---

## [0.2.10] - July 3, 2025

### 🔄 Changed

- SQL errors now return error object ({error:string}) instead of throwing error
