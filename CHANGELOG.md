# Changelog

All notable changes to this project will be documented in this file.

## [0.2.8] - 2026-10-08

### Fixed
- Replaced the regex Markdown parser with MarkdownIt for safe URL/attribute handling, nested lists, reference links, and CommonMark code fences.
- Disabled trusted KaTeX HTML/link/image commands and preserved all Markdown code regions during math extraction.
- Wait for webview readiness before sending initial content, and continue live updates while the preview has focus.
- Save validated reading preferences, align toolbar ranges with settings, and name controls for assistive technology.
- Detect VS Code theme classes correctly, preserve high-contrast text colors, and respect reduced motion.

### Added
- Document-relative local images with scoped resource roots; remote images remain blocked.
- Accessible MathML alongside KaTeX visual output.
- Executed webview-script and source-lifecycle regression tests.

### Changed
- Bundled runtime dependencies; removed unused packages and upgraded vulnerable dependencies.
- Clarified emphasis levels and removed unverified reading-performance claims.

## [0.2.7] - 2026-06-17

### Fixed
- Render GFM pipe tables in the preview. The webview parser previously had no
  table support, so tables fell through to plain paragraph text.

### Changed
- Extracted the webview markdown parser and math preprocessor into dedicated,
  unit-tested modules; the webview now runs the same tested parser.

## [0.2.1] - 2026-01-16

### Changed
- Updated descriptions and terminology for clarity
- Improved marketplace metadata

## [0.2.0] - 2026-01-11

### Fixed
- Aligned text highlighting algorithm with text-vide library
- Formula now uses `floor(length * fixationPoint / 6)` for accurate highlighting
- More conservative bolding that matches bionicmarkdown.com web app

## [0.1.5] - 2025-01-01

### Added
- Open source release
- Repository and issue tracking links

## [0.1.4] - 2025-01-01

### Added
- Feedback and support links

## [0.1.3] - 2025-01-01

### Changed
- Made repository private

## [0.1.2] - 2025-01-01

### Added
- Collapsible toolbar
- New split-view icon

## [0.1.1] - 2025-01-01

### Added
- Improved icon design
- Homepage link
- LICENSE file

### Changed
- Updated README with better documentation

## [0.1.0] - 2025-01-01

### Added
- Initial release
- Bold text highlighting preview for Markdown files
- Gradient Reading with 10 color themes
- Live preview that updates as you type
- Customizable settings:
  - Leading (fixation point): 1-5 characters
  - Opacity: 0-100%
  - Gradient theme selection
  - Font size: 12-24px
  - Line height: 1.2-2.0
- Built-in toolbar for quick adjustments
- Commands:
  - Open Bionic Preview
  - Open Bionic Preview to the Side
