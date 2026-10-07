# Bionic Markdown Preview

Read Markdown in VS Code with adjustable word emphasis, text opacity, and optional color themes. Choose the appearance that feels comfortable for you; this extension does not promise faster reading or improved comprehension.

## Open a preview

1. Open a Markdown file.
2. Open the Command Palette (`Cmd+Shift+P` on macOS, `Ctrl+Shift+P` on Windows/Linux).
3. Run **Bionic Markdown: Bionic Preview to Side**.

You can also use the preview button in the editor title or **Bionic Markdown: Bionic Preview** from the editor context menu.

The preview follows the most recently selected Markdown file and continues updating while the preview has focus. Typing is debounced briefly to keep updates responsive. The toolbar saves your preferences to VS Code user settings; workspace settings can override them.

## Reading controls

| Control | Range | Default |
| --- | --- | --- |
| Emphasis | 1–5, proportion of each word to bold | 3 |
| Opacity | 10–100%, non-bold text | 70% |
| Gradient | None or 10 optional palettes | None |
| Font size | 10–32 px | 16 px |
| Line height | 1–3 | 1.8 |

All controls work with the keyboard and have accessible names. Collapse the toolbar with the chevron button. High-contrast VS Code themes retain their own text colors even when a gradient is selected, and reduced-motion preferences suppress transitions.

The emphasis formula is `max(1, floor(wordLength × emphasis / 6))`, capped at the word length. Higher values emphasize more text. Code, links, and math are preserved. The Web app currently uses text-vide's lookup tables and Unicode word segmentation, so emphasis can differ across platforms.

## Markdown and math

Supports headings, nested lists, blockquotes, reference links, tables with or without outer pipes, fenced/indented code, and inline code. Math uses KaTeX with MathML for assistive technology: `$…$`, `$$…$$`, `\(…\)`, `\[…\]`, and supported `\begin{…}` environments. Common `\R`, `\N`, `\Z`, `\Q`, and `\C` macros are available.

Raw HTML is shown as text. Unsafe link protocols and KaTeX HTML/link/image commands are disabled. Document-relative images inside the Markdown file's folder are supported; remote and data images are intentionally blocked to avoid unsolicited network requests. File references outside that folder are outside the webview's permitted resource roots.

## Other platforms

| Platform | Link |
| --- | --- |
| Web app | [bionicmarkdown.com](https://bionicmarkdown.com) |
| Chrome extension | [Chrome repository](https://github.com/uiharu-kazari/chrome-bionic-preview) |

## Development

Use Node.js 24. Install dependencies with `npm ci`, then run `npm test`, `npm run lint`, and `npm run package`. Packaging builds a single extension bundle and includes only its code, metadata, icon, and KaTeX styles/fonts. `npm run publish` publishes the prepared version to the VS Code Marketplace and requires the publisher's credentials and explicit release approval.

If you find this extension helpful, consider [supporting on Ko-fi](https://ko-fi.com/illyasviel1120).
