# Changelog

## [0.0.6](https://github.com/getblitz-io/getblitz/compare/web-v0.0.5...web-v0.0.6) (2026-02-17)


### Features

* add Revolut Business API integration, including provider configuration, webhook handling, and documentation ([b98c008](https://github.com/getblitz-io/getblitz/commit/b98c008697d538cc4ac0182014b4920f12cb0c41))
* enhance bank account management by adding external account ID support and refactoring related services and interfaces ([8155ed3](https://github.com/getblitz-io/getblitz/commit/8155ed358c05d5f5bba36d91c819a92a0eae6137))
* enhance bank account management by adding external account ID support and refactoring related services and interfaces ([063b2f1](https://github.com/getblitz-io/getblitz/commit/063b2f1b968f935dbab87b7a4669a01ab2c14ba6))
* Implement a new queue and worker system for background tasks using bullmq ([#21](https://github.com/getblitz-io/getblitz/issues/21)) ([da8f78c](https://github.com/getblitz-io/getblitz/commit/da8f78c24467d8f2e98f532cfb0d7acbbc996d88))
* Implement invoice and customer management with dedicated pages, API, and database support ([#23](https://github.com/getblitz-io/getblitz/issues/23)) ([f895921](https://github.com/getblitz-io/getblitz/commit/f89592102eccf0220e68bc58f2d7dd9ae89bafdb))
* Introduce webhooks, multi-transaction payment support, and a new database schema for bank connections and organizations ([#20](https://github.com/getblitz-io/getblitz/issues/20)) ([656318f](https://github.com/getblitz-io/getblitz/commit/656318f611738ee7ea7f446d4e5241e435d85882))
* reconnect bank creds, websocket improvement, improved bank provider ([#24](https://github.com/getblitz-io/getblitz/issues/24)) ([5c7986c](https://github.com/getblitz-io/getblitz/commit/5c7986cb703e9d08dc1152f65a152ac1d8c75c8c))


### Code Refactoring

* switch auth database provider to PostgreSQL, remove unused webhook domain environment variable, and enhance session expiration error logging with stack traces. ([#22](https://github.com/getblitz-io/getblitz/issues/22)) ([116a3c1](https://github.com/getblitz-io/getblitz/commit/116a3c1d84575c3cccc7dbf6edc03bf004e86e19))

## [0.0.5](https://github.com/getblitz-io/getblitz/compare/web-v0.0.4...web-v0.0.5) (2026-01-06)


### Features

* Allow fetching bank provider config schema by provider ID and refactor bank connection routes. ([307450b](https://github.com/getblitz-io/getblitz/commit/307450b2df5648dda71e9dc4eacba94ad38588c7))
* introduce banks integration guide, and enhance bank provider metadata with setup guide URLs and test provider flags. ([f491c0f](https://github.com/getblitz-io/getblitz/commit/f491c0fb08cc6e91aecf03c51673bf91008e4fff))


### Code Refactoring

* Migrate database from MySQL to PostgreSQL and update deployment configurations ([18b7107](https://github.com/getblitz-io/getblitz/commit/18b710706383ed590ded3b81ef5b70e8c7142dd2))

## [0.0.4](https://github.com/getblitz-io/getblitz/compare/web-v0.0.3...web-v0.0.4) (2026-01-06)


### Features

* Improve the bank connection to use connection ID and add one-click deploy on Render and DigitalOcean ([634c020](https://github.com/getblitz-io/getblitz/commit/634c02094db23644bd20385cd2f21eca6afaaed1))
* Initialize getblitz opensource project ([c29b084](https://github.com/getblitz-io/getblitz/commit/c29b0849ea1c1cbba7bb230bd5b6e5d2d6643020))

## [0.0.3](https://github.com/getblitz-io/getblitz/compare/web-v0.0.2...web-v0.0.3) (2026-01-06)


### Features

* Improve the bank connection to use connection ID and add one-click deploy on Render and DigitalOcean ([750b1ce](https://github.com/getblitz-io/getblitz/commit/750b1ce7e9a6a35c23d03b45cb93719928602d11))

## [0.0.2](https://github.com/getblitz-io/getblitz/compare/web-v0.0.1...web-v0.0.2) (2026-01-06)


### Features

* Initialize getblitz opensource project ([c29b084](https://github.com/getblitz-io/getblitz/commit/c29b0849ea1c1cbba7bb230bd5b6e5d2d6643020))
