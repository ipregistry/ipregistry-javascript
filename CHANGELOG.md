# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.2] - 2020-10-28
### Changed
- Upgrade dependencies, especially to fix an issue affecting TypeScript users (https://github.com/axios/axios/issues/3219).

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

[Unreleased]: https://github.com/ipregistry/ipregistry-javascript/compare/3.0.2...HEAD
[3.0.2]: https://github.com/ipregistry/ipregistry-javascript/releases/tag/3.0.1...3.0.2
[3.0.1]: https://github.com/ipregistry/ipregistry-javascript/releases/tag/3.0.0...3.0.1
[3.0.0]: https://github.com/ipregistry/ipregistry-javascript/releases/tag/2.0.1...3.0.0
[2.0.1]: https://github.com/ipregistry/ipregistry-javascript/releases/tag/2.0.0...2.0.1
[2.0.0]: https://github.com/ipregistry/ipregistry-javascript/releases/tag/1.4.0...2.0.0
[1.4.0]: https://github.com/ipregistry/ipregistry-javascript/releases/tag/1.3.0...1.4.0
[1.3.0]: https://github.com/ipregistry/ipregistry-javascript/releases/tag/1.2.1...1.3.0
[1.2.1]: https://github.com/ipregistry/ipregistry-javascript/releases/tag/1.2.0...1.2.1
[1.2.0]: https://github.com/ipregistry/ipregistry-javascript/releases/tag/1.1.0...1.2.0
[1.1.0]: https://github.com/ipregistry/ipregistry-javascript/releases/tag/1.0.0...1.1.0
[1.0.0]: https://github.com/ipregistry/ipregistry-javascript/releases/tag/0.10.1...1.0.0
[0.10.1]: https://github.com/ipregistry/ipregistry-javascript/releases/tag/0.10.0...0.10.1
[0.10.0]: https://github.com/ipregistry/ipregistry-javascript/releases/tag/0.9.2...0.10.0
[0.9.2]: https://github.com/ipregistry/ipregistry-javascript/releases/tag/0.9.1...0.9.2
[0.9.1]: https://github.com/ipregistry/ipregistry-javascript/releases/tag/0.9.1
