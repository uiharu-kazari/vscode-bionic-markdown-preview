# VS Code product and engineering review — 2026-10-08

> This report records the review before publication. The user subsequently approved public source synchronization and the prepared release candidates; publication results are verified separately.

## Decision

Prepared version **0.2.8** for release approval. The core reading flow has been inspected in source, exercised by automated regression tests, and reviewed in an isolated native VS Code development host. Nothing was committed, pushed, or published during this review.

The repository was clean at baseline commit `a7ea5dd`, version 0.2.7. There is no repository-specific AGENTS.md; inherited user instructions prohibit making previously private content public without explicit approval. The GitHub repository is already public, verified read-only through GitHub: <https://github.com/uiharu-kazari/vscode-bionic-markdown-preview>. New local edits and the new release remain unpublished.

## Product findings and changes

| Finding | Result |
| --- | --- |
| Regex-generated link/image attributes accepted injected quote characters; code/table/nested Markdown parsing was incomplete. | Replaced with MarkdownIt 14.3.2 in the extension host, raw HTML disabled and link protocols restricted to HTTP, HTTPS, mailto and relative references. Tables, nested lists, reference links, indented/long/unclosed fences and multi-backtick inline code now follow Markdown parsing rules. |
| KaTeX used `trust: true`, enabling HTML classes, URL commands and image commands. | KaTeX 0.19.0 uses `trust: false`, finite expansion/size limits, escaped fallback text, and HTML plus MathML output. Code-region protection uses Markdown token source maps; literal math placeholder text cannot collide with generated math IDs. |
| Initial content was sent before the webview's readiness notification and could disappear. | A ready handshake sends settings and source content after the listener exists. The source is captured before creating the panel changes editor focus. |
| Edits were ignored when the preview had focus. | The panel tracks its source document independently of the active editor and debounces updates by 100 ms. Unrelated files do not replace its content. Disposal cancels pending updates and is idempotent. |
| Toolbar preferences were transient, unnamed for assistive technology, and had different ranges from VS Code settings. | Validated preferences save to user settings. Accessible labels, collapse state, keyboard focus, and consistent emphasis/opacity/font/line-height ranges are included. Workspace configuration can override user preferences. |
| Theme detection treated many light themes as dark; gradients overrode high-contrast colors. | Reads VS Code theme classes; high-contrast themes preserve their colors. Reduced motion suppresses transitions. Narrow previews have smaller margins and tables can scroll horizontally. |
| Markdown images were all blocked by CSP. | Document-relative images inside the source folder use scoped webview resource URIs. Remote/data images remain blocked, with a readable placeholder. Local preview never fetches those image URLs. |
| Packaging shipped unused dependencies and about 2.18 MB of compressed content. | A single runtime bundle plus icons/KaTeX CSS/fonts/license notices reduces the prepared package to about 1.09 MB. Tests, source files, maps, review fixtures and node_modules are excluded. |
| Documentation claimed faster reading and described emphasis as a fixed character count. | README/metadata now describe user-adjustable reading appearance without performance claims; commands and ranges match the app. |

All tracked source modules, existing tests, package configuration, hidden launch/tasks/ignore configuration, README, changelog, license, and asset usage were inspected. The live update and settings paths are implemented in `src/BionicPreviewPanel.ts` and `src/extension.ts`; host Markdown/math rendering lives in `src/markdownParser.ts` and `src/mathPreprocessor.ts`.

## Verification

Use Node.js 24.4.0 in this workspace. The shell's default Node 16 must not run modern development tooling.

```sh
export PATH=/Users/hina/.nvm/versions/node/v24.4.0/bin:$PATH
npm test
npm run lint
npm run package
npm audit
```

- Baseline: 33 automated tests passed and TypeScript compilation passed.
- Final: **57 tests across 6 files passed**. These include malicious URL/attribute cases, Markdown geometry, code boundaries, math trust/accessibility, settings validation, source readiness/focus/disposal, local-image boundaries, and execution of the actual generated webview script in a DOM environment.
- TypeScript check passed. Runtime bundle compilation and VSIX packaging passed.
- All-dependency audit: **0 vulnerabilities**, including development tooling, at the time of this review. Raw audit result: `artifacts/dependency-audit.json`.
- Archive inspection confirms 80 files, 60 KaTeX fonts, 9 bundled dependency license notices, the extension bundle, version 0.2.8, and no node_modules/source/maps/review fixtures. Machine-readable verification: `artifacts/package-verification.json`.
- `git diff --check` passed.

### Native VS Code evidence

The coordinator exercised the application through CUA in an isolated official VS Code development host, with user data at `/tmp/bionic-vscode-review-20261008` and extensions at `/tmp/bionic-vscode-review-extensions-20261008`. The user's main VS Code profile was not used for installation/testing.

The preview populated real heading/prose, inline/display math, a table, unchanged code, and a local PNG. Toolbar collapse worked. With preview toolbar focus, the fixture changed from `LIVE-UPDATE-ORIGINAL` to `LIVE-UPDATE-VERIFIED`, and the actual native preview updated. Native screenshot evidence is at `../release-review-2026-10-08/07-vscode-native.png`. This is separate from mocked lifecycle tests and DOM execution.

Fixture: `artifacts/review-fixture.md`, with `artifacts/review-icon.png`. The coordinator reloaded the final host, verified the filename title and blocked-image placeholder, changed emphasis from 3 to 4 through the native control, closed and reopened the side preview, and confirmed emphasis remained 4. Final native evidence: `../release-review-2026-10-08/09-vscode-settings-persisted.png`.

## Prepared artifact and publication

- Package: `bionic-markdown-preview-0.2.8.vsix`
- Size: **1,089,697 bytes**
- SHA-256: `e2fe304a89d152ff1807c77e9f775c4d6e198270aa34616f02668a8c65de1f5f`
- Publisher/extension ID: **BionicMarkdown.bionic-markdown-preview**
- Existing official listing: <https://marketplace.visualstudio.com/items?itemName=BionicMarkdown.bionic-markdown-preview>
- `vsce ls-publishers` lists `BionicMarkdown`; stored credential validity was not tested. `VSCE_PAT` and `OVSX_PAT` environment variables were absent. No credential values were read or printed.
- Release command, after explicit approval and authenticated publisher access: `npm run publish`.
- Source synchronization to the public GitHub remote also requires explicit approval for these unpublished edits.

## Remaining limits

- Cross-platform emphasis is not identical: VS Code preserves its `max(1, floor(wordLength × emphasis / 6))` formula and whitespace splitting; the Web app uses text-vide lookup tables and Unicode word segmentation. This patch deliberately leaves that contract change for separate coordinated work.
- Native testing used the installed VS Code version; minimum supported VS Code 1.80, Windows/Linux, remote workspaces, and screen-reader interaction were not separately exercised. Theme behavior has automated DOM evidence; a full native theme/screen-reader matrix remains open.
- Existing relative Markdown navigation/heading anchors are not upgraded by this patch. Local image resource roots intentionally exclude files above the source folder.
- No user study measures reading speed or comprehension. Documentation makes no such promise.
- Publication and marketplace propagation are unverified because publishing remains pending approval.

Implementation choices for KaTeX safety, accessible output and expansion/size limits follow the primary [KaTeX option documentation](https://katex.org/docs/options.html).
