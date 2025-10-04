# 📋 Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

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
