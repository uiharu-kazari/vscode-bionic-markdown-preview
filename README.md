# Bionic Markdown Preview

A VSCode extension that previews Markdown with Bionic Reading and Gradient Reading for faster, more focused reading.

## Features

- **Bionic Reading**: Automatically bolds the initial portions of words to guide your eye along text more efficiently
- **Gradient Reading**: Applies color gradients to help track lines visually
- **Live Preview**: Updates in real-time as you type
- **Configurable**: Adjust fixation point, opacity, font size, and more

## Usage

1. Open a Markdown file
2. Run the command `Bionic Markdown: Open Bionic Preview to the Side` from the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
3. Or right-click in the editor and select "Open Bionic Preview"

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `bionicPreview.fixationPoint` | 3 | Characters to bold at word start (1-5) |
| `bionicPreview.opacity` | 0.7 | Opacity of non-bolded text (0.1-1.0) |
| `bionicPreview.gradientTheme` | none | Gradient theme for line coloring |
| `bionicPreview.fontSize` | 16 | Font size in pixels |
| `bionicPreview.lineHeight` | 1.8 | Line height multiplier |

### Gradient Themes

- `none` - No gradient
- `ocean` - Blue/teal tones
- `sunset` - Orange/red tones
- `forest` - Green tones
- `berry` - Pink/purple tones
- `lavender` - Purple tones
- `autumn` - Brown/orange tones
- `mint` - Teal/green tones
- `twilight` - Deep purple tones
- `coffee` - Brown tones
- `monochrome` - Gray tones

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Package extension
npm run package
```

## Testing Locally

1. Open this folder in VSCode
2. Press `F5` to launch Extension Development Host
3. Open a `.md` file in the new window
4. Run the command "Open Bionic Preview to the Side"
