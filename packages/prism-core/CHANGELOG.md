# Changelog

All notable changes to @prism-lang/core will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.25] - 2024-12-17

### Added
- Added `runPrism` helper function for easy code execution
- Added `createPrismRuntime` helper for creating configured runtimes
- Added support for `default` branch in uncertain statements
- Improved infinite loop prevention in uncertain loops

### Fixed
- Fixed infinite loop bug in uncertain while/for loops when no branch matches
- Fixed test issues with uncertain loops not resetting state between tests

### Changed
- Made `runPrism` the recommended way to execute Prism code
- Updated documentation to reflect actual implementation

## [1.0.24] - Previous Release

### Changed
- Initial monorepo migration
- Package renamed from `prism-uncertainty` to `@prism-lang/core`