# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.11] - 2025-07-03

### Changed

- objectUpdate and other methods also returns error object ({error:string}) instead of throwing error

### Security

- now console.log error.sqlMessage but return error object ({error:string}) with error code for limited information. Otherwise sql statements can be exposed to the client.

## [0.2.10] - 2025-07-03

### Changed

- SQL errors now return error object ({error:string}) instead of throwing error
