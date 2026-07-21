# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Custom `fetch` implementation: pass `fetch` in the client options to route
  requests through your own implementation (proxies, instrumentation,
  testing), e.g. `new IpregistryClient({ apiKey, fetch: myFetch })`.
- Typed field selection: when a literal `fields` expression is passed, the
  response type is narrowed to the selected fields, including nested paths,
  e.g. `client.lookupIp(ip, { fields: 'location.region' })` resolves to
  `ApiResponse<{ location: { region: Region } }>` and accessing unselected
  fields (even within `location`) is a compile-time error. Comma-separated
  selections are merged and paths that traverse arrays narrow the element
  type. Dynamic (non-literal) expressions keep the full response type. The
  new `SelectedFields` utility type is exported.
- Missing `decimal_separator` and `group_separator` fields in
  `CurrencyFormat`.

## [7.0.0]

### Added

- Options-object API: construct the client with `new IpregistryClient({ apiKey, baseUrl, timeout, maxRetries, cache, ... })` and pass per-call options as a plain object, e.g. `client.lookupIp(ip, { fields: 'location', hostname: true })`. The `baseUrl` option accepts the shorthand `'eu'` for the European Union endpoint.
- Request cancellation: every lookup accepts an `AbortSignal` via `{ signal }`. Aborting cancels the in-flight request, pending retries and their backoff waits, and pending batch chunks.
- `parseUserAgents` accepts an array (`client.parseUserAgents([ua1, ua2])`) in addition to the deprecated variadic form.
- Generic cache typing: `IpregistryCache<V>` and the new `IpregistryCacheValue` type.

### Changed

- The library is now compiled with full TypeScript strict mode (`noImplicitAny` enabled).

### Deprecated

- `IpregistryConfigBuilder`: pass an `IpregistryClientOptions` object to the constructor instead.
- `IpregistryOption`, `FilterOption`, `HostnameOption`, `IpregistryOptions` and the variadic lookup signatures: pass a `LookupOptions` object instead.
- The variadic `parseUserAgents(...userAgents)` form: pass an array instead.

All deprecated forms keep working in 7.x and behave identically (including cache
key compatibility between legacy options and their `LookupOptions` equivalents);
they will be removed in a future major version.

### Migration

```typescript
// Before (6.x)                                    // After (7.x)
new IpregistryClient(                              new IpregistryClient({
    new IpregistryConfigBuilder('KEY')                 apiKey: 'KEY',
        .withEuBaseUrl()                               baseUrl: 'eu',
        .withTimeout(10000)                            cache: new InMemoryCache(),
        .build(),                                      timeout: 10000,
    new InMemoryCache())                           })

client.lookupIp(ip,                                client.lookupIp(ip, {
    IpregistryOptions.filter('location'),              fields: 'location',
    IpregistryOptions.hostname(true))                  hostname: true,
                                                   })
```

## [6.2.0] - 2026-07-05

### Added

- Automatic splitting of large batch lookups, aligned with the Go client: inputs beyond the API limit (1024 values) are chunked and dispatched with bounded concurrency, preserving input order. Configurable via `withMaxBatchSize` and `withBatchConcurrency` (default 4, set 1 for sequential dispatch).
- New `DEFAULT_MAX_BATCH_SIZE` constant exposing the API per-request limit.

### Changed

- Document timeout, retry, and batch configuration in the README.

## [6.1.0] - 2026-07-05

### Added

- Configurable retry behavior aligned with the Go client: `withMaxRetries` (default 3), `withRetryInterval` (exponential backoff base, default 1 second), `withRetryOnServerError` (default true) and `withRetryOnTooManyRequests` (default false, honoring the `Retry-After` header when enabled).

### Changed

- Require Node.js 20+.
- Retry transient network errors and, by default, 5xx responses; previously only timeouts were retried.
- Replace the `lru-cache` dependency with an internal implementation; the library now has zero runtime dependencies.

## [6.0.2] - 2026-07-05

### Fixed

- Return `false` from `isError` and `isApiError` for non-object values instead of throwing a `TypeError`.

### Changed

- Declare the package side-effect free to improve tree-shaking by bundlers.
- Expose `package.json` through the package `exports` map.

## [6.0.1] - 2026-07-04

### Fixed

- Map request timeouts to a `ClientError` with message 'Request timed out'; a typo prevented the mapping from ever matching.
- Send the current library version in the `user-agent` header instead of a hardcoded 4.0.0.
- Percent-encode user-supplied values interpolated into API URL paths.
- Cache batch lookup results under the requested IP addresses and ASNs so that caching works when the `fields` option filters out the `ip` or `asn` response fields.
- Declare the `types` condition first in the package `exports` map and provide format-specific type declarations so that TypeScript resolves them for both ESM and CommonJS consumers.

## [6.0.0] - 2024-06-04

### Changed

- Modify the library packaging to make ECMAScript modules (ESM) optional.
- Substitute the 'ky' dependency with native fetch API.
- Reduce the default timeout setting to 5 seconds.
- Implement retries, up to two times, with exponential backoff in the event of a timeout.

## [5.0.2] - 2024-03-27

### Added

- Add missing fields `size` and `status` to type _AutonomousSystemPrefix_.

## [5.0.1] - 2024-03-17

### Fixed

- Fix a packaging issue.

## [5.0.0] - 2024-03-17

### Added

- New `IpregistryClient#batchLookupAsns` method.
- New `IpregistryClient#lookupAsn` method.
- New `IpregistryClient#originLookupAsn` method.
- New `IpregistryConfigBuilder.withEuBaseUrl` method. Once configured, requests will be handled by nodes deployed in the European Union only.
- New `IpregistryRequestHandler#batchLookupAsns` method.
- New `IpregistryRequestHandler#lookupAsn` method.
- New `IpregistryRequestHandler#originLookupAsn` method.

### Changed

- Rename `IpregistryClient#batchLookup` to `IpregistryClient#batchLookupIps`.
- Rename `IpregistryClient#lookup` to `IpregistryClient#lookupIp`.
- Rename `IpregistryClient#originLookup` to `IpregistryClient#originLookupIp`.
- Rename `IpregistryClient#parse` to `IpregistryClient#parseUserAgents`.
- Rename `IpregistryConfigBuilder.withApiUrl` to `IpregistryConfigBuilder.withBaseUrl`.
- Rename `IpregistryRequestHandler#batchLookup` to `IpregistryRequestHandler#batchLookupIps`.
- Rename `IpregistryRequestHandler#lookup` to `IpregistryRequestHandler#lookupIp`.
- Rename `IpregistryRequestHandler#originLookup` to `IpregistryRequestHandler#originLookupIp`.
- Rename `IpregistryRequestHandler#parse` to `IpregistryRequestHandler#parseUserAgents`.
- Rename utility class `UserAgent` to `UserAgents`.
- Replace _Axios_ by _ky_ to bring support to Cloudflare Workers in addition to browser and NodeJS environments.
- Require NodeJS 18+.

### Fixed

- Fixed origin requests returning wrong information when caching is enabled. Cache is now automatically disabled for
  origin requests since it is incompatible.

## [4.5.0] - 2022-04-15

### Added

- New `is_vpn` field in `security` object.

## [4.4.2] - 2022-04-03

### Fixed

- Invalid field name `security.is_tor_exit_node` has been renamed to `security.is_tor_exit`.

### Changed

- Upgrade dependencies.

## [4.4.1] - 2022-02-14

- Upgrade dependencies.

## [4.4.0] - 2021-12-21

### Added

- New `security.is_relay` field.

## [4.3.0] - 2021-12-14

### Added

- New `parse` method in _IpregistryClient_ for parsing user-agent header values.

### Deprecated

- Deprecate `IpregistryConfigBuilder.withApiUrl` in favor of `IpregistryConfigBuilder.withBaseUrl`.

### Fixed

- Replace invalid `operating_system` field in _UserAgent_ by `os`.

## [4.2.0] - 2021-10-26

### Added

- _IpInfo_ responses have a new `company` field.
- The _Connection_ type field includes a new value of `INACTIVE`.

## [4.1.0] - 2021-07-26

### Added

- New connection type `government`.

### Changed

- Improve utility function to detect bots/crawlers/spiders based on user-agent value.

### Fixed

- Fix invalid property names: `language.name_native` -> `language.native` and `time_zone.daylight_saving` -> `time_zone.in_daylight_saving`.

### Removed

- Merge connection type `cdn` with `hosting`.

## [4.0.0] - 2021-04-08

### Changed

- [BREAKING] Rename _DefaultCache_ to _InMemoryCache_.
- Upgrade dependencies.

## [3.1.0] - 2020-12-02

### Changed

- Use _Authorization_ header instead of the _key_ query parameter to pass API keys.

## [3.0.2] - 2020-10-28

### Changed

- Upgrade dependencies to fix an issue affecting TypeScript users (https://github.com/axios/axios/issues/3219).

## [3.0.1] - 2020-10-03

### Fixed

- Access to remaining credits was always returning `null` due to a packaging issue.

## [3.0.0] - 2020-06-27

### Changed

- Caching is now optional and disabled by default.
- Default timeout value has been increased to 15s from 3s.

## [2.0.1] - 2020-10-03

### Fixed

- Fix access to remaining credits due to the removal of the response header `ipregistry-credits` from the Ipregistry API.

## [2.0.0] - 2020-03-12

### Changed

- [BREAKING] All client methods use a new [ApiResponse](https://github.com/ipregistry/ipregistry-javascript/blob/master/src/request.ts#L25) type as response.
  You can now access usage data (i.e. remaining credits, throttling info) in addition to IP payloads.

## [1.4.0] - 2020-01-12

### Added

- New field `connection.route` in response model.
- Introduce new value `cdn` for field `connection.type`.

### Fixed

- Define a null union type for all fields that can have a `null` value.

## [1.3.0] - 2019-10-27

### Added

- New currency fields `name_native` and `plural_native`.

### Changed

- Decrease the default cache period to 10min from 24h.
  This is to better handle use cases that require fresh [security data](https://ipregistry.co/docs/proxy-tor-threat-detection#content).
  Indeed, such data is updated multiple times each hour.
  You can still configure the cache period to a higher value:
  https://github.com/ipregistry/ipregistry-javascript#configuring-cache-max-age

## [1.2.1] - 2019-10-08

### Fixed

- Fix a packaging issue.

## [1.2.0] - 2019-10-08

### Added

- Add examples for cache configuration, hostname lookup and fields selection.
- Add `BAD_REQUEST` and `FORBIDDEN_IP_ORIGIN` error codes.

### Changed

- Export ipregistry as default export in client side module.

## [1.1.0] - 2019-08-08

### Added

- License headers.
- Types for new fields returned by the Ipregistry API.

## [1.0.0] - 2019-07-24

### Changed

- All custom errors extend IpregistryError.

### Fixed

- Ignore case when checking if User-Agent is spider/bot.

## [0.10.1] - 2019-07-24

- Fix deployment to NPM. No code change.

## [0.10.0] - 2019-07-24

### Changed

- Rename browser file to `index.js` from `index.browser.js`.

## [0.9.2] - 2019-07-24

### Added

- Browser support.

## [0.9.1] - 2019-07-23

- First public release.

[Unreleased]: https://github.com/ipregistry/ipregistry-javascript/compare/6.0.0...HEAD
[6.0.0]: https://github.com/ipregistry/ipregistry-javascript/compare/6.0.0...5.0.2
[5.0.2]: https://github.com/ipregistry/ipregistry-javascript/compare/5.0.1...5.0.2
[5.0.1]: https://github.com/ipregistry/ipregistry-javascript/compare/5.0.0...5.0.1
[5.0.0]: https://github.com/ipregistry/ipregistry-javascript/compare/4.5.0...5.0.0
[4.5.0]: https://github.com/ipregistry/ipregistry-javascript/compare/4.4.2...4.5.0
[4.4.2]: https://github.com/ipregistry/ipregistry-javascript/compare/4.4.1...4.4.2
[4.4.1]: https://github.com/ipregistry/ipregistry-javascript/compare/4.4.0...4.4.1
[4.4.0]: https://github.com/ipregistry/ipregistry-javascript/compare/4.3.0...4.4.0
[4.3.0]: https://github.com/ipregistry/ipregistry-javascript/compare/4.2.0...4.3.0
[4.2.0]: https://github.com/ipregistry/ipregistry-javascript/compare/4.1.0...4.2.0
[4.1.0]: https://github.com/ipregistry/ipregistry-javascript/compare/4.0.0...4.1.0
[4.0.0]: https://github.com/ipregistry/ipregistry-javascript/compare/3.1.0...4.0.0
[3.1.0]: https://github.com/ipregistry/ipregistry-javascript/compare/3.0.2...3.1.0
[3.0.2]: https://github.com/ipregistry/ipregistry-javascript/compare/3.0.1...3.0.2
[3.0.1]: https://github.com/ipregistry/ipregistry-javascript/compare/3.0.0...3.0.1
[3.0.0]: https://github.com/ipregistry/ipregistry-javascript/compare/2.0.1...3.0.0
[2.0.1]: https://github.com/ipregistry/ipregistry-javascript/compare/2.0.0...2.0.1
[2.0.0]: https://github.com/ipregistry/ipregistry-javascript/compare/1.4.0...2.0.0
[1.4.0]: https://github.com/ipregistry/ipregistry-javascript/compare/1.3.0...1.4.0
[1.3.0]: https://github.com/ipregistry/ipregistry-javascript/compare/1.2.1...1.3.0
[1.2.1]: https://github.com/ipregistry/ipregistry-javascript/compare/1.2.0...1.2.1
[1.2.0]: https://github.com/ipregistry/ipregistry-javascript/compare/1.1.0...1.2.0
[1.1.0]: https://github.com/ipregistry/ipregistry-javascript/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/ipregistry/ipregistry-javascript/compare/0.10.1...1.0.0
[0.10.1]: https://github.com/ipregistry/ipregistry-javascript/compare/0.10.0...0.10.1
[0.10.0]: https://github.com/ipregistry/ipregistry-javascript/compare/0.9.2...0.10.0
[0.9.2]: https://github.com/ipregistry/ipregistry-javascript/compare/0.9.1...0.9.2
[0.9.1]: https://github.com/ipregistry/ipregistry-javascript/releases/tag/0.9.1
