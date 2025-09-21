# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.13] - 2025-09-22

### Changed

- added client/nats.ts
- added nkey support to nats.server.ts

### Bug Fixes

- nats.request throw error if response is not a valid JSON. Now it returns text or object depending on service response.

## [0.2.12] - 2025-07-17

### Changed

- cache.server.ts now uses expireDate to keep cache data in sqlite database until expireDate.

## [0.2.11] - 2025-07-03

### Changed

- objectUpdate and other methods also returns error object ({error:string}) instead of throwing error

### Security

- now console.log error.sqlMessage but return error object ({error:string}) with error code for limited information. Otherwise sql statements can be exposed to the client.

## [0.2.10] - 2025-07-03

### Changed

- SQL errors now return error object ({error:string}) instead of throwing error
