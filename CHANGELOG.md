## [1.4.1](https://github.com/QuentinJanuel/envoyage/compare/v1.4.0...v1.4.1) (2025-08-18)


### Bug Fixes

* optimize npm package configuration ([c75804d](https://github.com/QuentinJanuel/envoyage/commit/c75804d7961421a4af1d6a8d1dcfc4dfc84afeea))

# [1.4.0](https://github.com/QuentinJanuel/envoyage/compare/v1.3.0...v1.4.0) (2025-08-10)


### Features

* add listVariables method for environment variable validation ([978ec81](https://github.com/QuentinJanuel/envoyage/commit/978ec81a6172654545b2c37d27b6b45d1a6e1b36))

# [1.3.0](https://github.com/QuentinJanuel/envoyage/compare/v1.2.0...v1.3.0) (2025-08-10)


### Features

* utilize Redacted for environment data ([bb807a8](https://github.com/QuentinJanuel/envoyage/commit/bb807a8ba782db093c5298beacac875ea3bb8635))

# [1.2.0](https://github.com/QuentinJanuel/envoyage/compare/v1.1.0...v1.2.0) (2025-08-10)


### Features

* implement getAllFor method in Resolver to retrieve variable values by resolution tag across environments ([fa04881](https://github.com/QuentinJanuel/envoyage/commit/fa04881e6a482002a48f294a5751980174592f15))

# [1.1.0](https://github.com/QuentinJanuel/envoyage/compare/v1.0.0...v1.1.0) (2025-08-09)


### Features

* add getAll method to Resolver for retrieving all accessible variables ([2969c81](https://github.com/QuentinJanuel/envoyage/commit/2969c816cde496c53626e5fdce6571b8955649a3))

# 1.0.0 (2025-08-09)

Initial release of envoyage - a type-safe environment variable management library for TypeScript applications.

### Features

* **Core Library**: Complete type-safe environment variable management system
* **Multiple Resolution Strategies**: Support for hardcoded values, environment variables, secrets, and custom resolution methods
* **Async/Sync Resolution**: Handle both synchronous and asynchronous variable resolution
* **Dynamic Variables**: Support for runtime-provided values through dynamic resolution
* **Environment Registry**: Centralized management of multiple environments (local, staging, production, etc.)
* **Variable Registry**: Define variables once and configure how they resolve across different environments
* **Merge Support**: Combine multiple variable registries for modular configuration
* **Full TypeScript Support**: Complete type safety across all aspects of environment configuration
