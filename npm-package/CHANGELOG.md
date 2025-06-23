# Changelog

All notable changes to prism-uncertainty will be documented in this file.

## [1.0.3] - 2024-06-22

### Fixed
- LLM providers now properly initialize when API keys are provided
- Fixed "No LLM provider configured" error when using geminiApiKey or anthropicApiKey options
- Providers are automatically registered and set as default when API keys are available

## [1.0.2] - 2024-06-22

### Fixed
- Updated GitHub repository URL in documentation to correct address

## [1.0.1] - 2024-06-06

### Added
- Semicolon support for statement separation
- Better handling of multiple statements per line
- Backwards compatibility maintained (semicolons are optional)

### Fixed
- Parser now properly consumes semicolons after statements
- Improved statement boundary detection

### Known Issues
- Multiple assignments on one line (e.g., `x = 10; y = 20`) still require workaround
- Recommended: Use one statement per line for best results

## [1.0.0] - 2024-06-06

### Initial Release
- 18 confidence-aware operators for uncertainty handling
- Native LLM integration support
- Uncertainty-aware control flow (uncertain if statements)
- Automatic confidence propagation
- Full TypeScript implementation
- Interactive REPL
- CLI tools (prism run, prism eval, prism repl)
- npm package: prism-uncertainty