import * as vscode from 'vscode';

export interface PreviewSettings {
  fixationPoint: number;
  opacity: number;
  gradientTheme: string;
  fontSize: number;
  lineHeight: number;
}

export function getWebviewContent(
  webview: vscode.Webview,
  settings: PreviewSettings
): string {
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Bionic Preview</title>
  <style>
    :root {
      --font-size: ${settings.fontSize}px;
      --line-height: ${settings.lineHeight};
      --dim-opacity: ${settings.opacity};
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      font-size: var(--font-size);
      line-height: var(--line-height);
      padding: 0;
      margin: 0;
      color: var(--vscode-editor-foreground);
      background-color: var(--vscode-editor-background);
    }

    /* Toolbar styles */
    .toolbar-container {
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--vscode-editor-background);
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .toolbar {
      padding: 8px 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      transition: all 0.2s ease;
    }

    .toolbar.hidden {
      display: none;
    }

    .toolbar-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 4px;
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--vscode-descriptionForeground);
      transition: color 0.2s;
    }

    .toolbar-toggle:hover {
      color: var(--vscode-foreground);
    }

    .toolbar-toggle svg {
      transition: transform 0.2s;
    }

    .toolbar-toggle.collapsed svg {
      transform: rotate(180deg);
    }

    .toolbar-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toolbar-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .toolbar select,
    .toolbar input[type="range"] {
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
      cursor: pointer;
    }

    .toolbar select:focus,
    .toolbar input:focus {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }

    .toolbar input[type="range"] {
      width: 80px;
      padding: 0;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: var(--vscode-scrollbarSlider-background);
      border-radius: 2px;
    }

    .toolbar input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--vscode-button-background);
      cursor: pointer;
      border: none;
    }

    .toolbar input[type="range"]::-webkit-slider-thumb:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .value-display {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      min-width: 28px;
      text-align: center;
    }

    .toolbar-icon {
      color: var(--vscode-descriptionForeground);
      flex-shrink: 0;
    }

    /* Gradient preview dots */
    .gradient-preview {
      display: flex;
      gap: 2px;
      margin-left: 4px;
    }

    .gradient-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    #preview {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px 40px;
    }

    /* Bionic reading styles */
    .bionic-dim {
      opacity: var(--dim-opacity);
    }

    /* Typography */
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
    }

    h1 { font-size: 2em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1em; }

    p {
      margin: 1em 0;
    }

    a {
      color: var(--vscode-textLink-foreground);
    }

    a:hover {
      color: var(--vscode-textLink-activeForeground);
    }

    code {
      font-family: var(--vscode-editor-font-family), monospace;
      background-color: var(--vscode-textCodeBlock-background);
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-size: 0.9em;
    }

    pre {
      background-color: var(--vscode-textCodeBlock-background);
      padding: 1em;
      border-radius: 6px;
      overflow-x: auto;
    }

    pre code {
      background: none;
      padding: 0;
    }

    blockquote {
      border-left: 4px solid var(--vscode-textBlockQuote-border);
      margin: 1em 0;
      padding-left: 1em;
      color: var(--vscode-textBlockQuote-foreground);
    }

    ul, ol {
      padding-left: 2em;
      margin: 1em 0;
    }

    li {
      margin: 0.5em 0;
    }

    hr {
      border: none;
      border-top: 1px solid var(--vscode-panel-border);
      margin: 2em 0;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }

    th, td {
      border: 1px solid var(--vscode-panel-border);
      padding: 0.5em 1em;
      text-align: left;
    }

    th {
      background-color: var(--vscode-editor-selectionBackground);
    }

    img {
      max-width: 100%;
      height: auto;
    }

    .empty-state {
      text-align: center;
      color: var(--vscode-descriptionForeground);
      padding: 40px;
    }
  </style>
</head>
<body>
  <div class="toolbar-container">
    <div class="toolbar" id="toolbar">
      <div class="toolbar-group">
        <span class="toolbar-label">Leading</span>
        <input type="range" id="fixation" min="1" max="5" step="1" value="${settings.fixationPoint}">
        <span class="value-display" id="fixation-value">${settings.fixationPoint}</span>
      </div>

      <div class="toolbar-group">
        <span class="toolbar-label">Opacity</span>
        <input type="range" id="opacity" min="0" max="100" step="1" value="${Math.round(settings.opacity * 100)}">
        <span class="value-display" id="opacity-value">${Math.round(settings.opacity * 100)}%</span>
      </div>

      <div class="toolbar-group">
        <span class="toolbar-label">Gradient</span>
        <select id="gradient">
          <option value="none">None</option>
          <option value="ocean">Ocean</option>
          <option value="sunset">Sunset</option>
          <option value="forest">Forest</option>
          <option value="berry">Berry</option>
          <option value="lavender">Lavender</option>
          <option value="autumn">Autumn</option>
          <option value="mint">Mint</option>
          <option value="twilight">Twilight</option>
          <option value="coffee">Coffee</option>
          <option value="monochrome">Monochrome</option>
        </select>
        <div class="gradient-preview" id="gradient-preview"></div>
      </div>

      <div class="toolbar-group">
        <svg class="toolbar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
        </svg>
        <input type="range" id="fontSize" min="12" max="24" step="1" value="${settings.fontSize}">
        <span class="value-display" id="fontSize-value">${settings.fontSize}</span>
      </div>

      <div class="toolbar-group">
        <svg class="toolbar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
        <input type="range" id="lineHeight" min="1.2" max="2" step="0.1" value="${settings.lineHeight}">
        <span class="value-display" id="lineHeight-value">${settings.lineHeight}</span>
      </div>
    </div>
    <button class="toolbar-toggle" id="toolbar-toggle" title="Toggle toolbar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    </button>
  </div>

  <div id="preview">
    <div class="empty-state">
      <p>Open a Markdown file to see the bionic preview</p>
    </div>
  </div>

  <script nonce="${nonce}">
    // Gradient theme configurations
    const GRADIENT_THEMES = {
      none: { colors: null, preview: [] },
      ocean: {
        colors: [
          { h: 195, s: 90, l: 40 },
          { h: 180, s: 85, l: 38 },
          { h: 210, s: 92, l: 42 },
          { h: 170, s: 80, l: 36 },
          { h: 200, s: 88, l: 44 },
        ],
        preview: ['#0891b2', '#0d9488', '#0284c7', '#14b8a6', '#0ea5e9']
      },
      sunset: {
        colors: [
          { h: 15, s: 95, l: 48 },
          { h: 35, s: 92, l: 45 },
          { h: 350, s: 88, l: 50 },
          { h: 25, s: 90, l: 46 },
          { h: 5, s: 85, l: 52 },
        ],
        preview: ['#ea580c', '#d97706', '#e11d48', '#f59e0b', '#ef4444']
      },
      forest: {
        colors: [
          { h: 142, s: 76, l: 36 },
          { h: 158, s: 64, l: 38 },
          { h: 120, s: 50, l: 40 },
          { h: 150, s: 70, l: 34 },
          { h: 130, s: 60, l: 42 },
        ],
        preview: ['#16a34a', '#059669', '#4d7c0f', '#10b981', '#22c55e']
      },
      berry: {
        colors: [
          { h: 330, s: 85, l: 48 },
          { h: 280, s: 75, l: 50 },
          { h: 350, s: 80, l: 52 },
          { h: 300, s: 70, l: 46 },
          { h: 320, s: 82, l: 50 },
        ],
        preview: ['#db2777', '#a855f7', '#f43f5e', '#c026d3', '#ec4899']
      },
      lavender: {
        colors: [
          { h: 260, s: 60, l: 55 },
          { h: 240, s: 55, l: 52 },
          { h: 280, s: 50, l: 58 },
          { h: 250, s: 58, l: 50 },
          { h: 270, s: 52, l: 56 },
        ],
        preview: ['#8b5cf6', '#6366f1', '#a78bfa', '#7c3aed', '#818cf8']
      },
      autumn: {
        colors: [
          { h: 25, s: 80, l: 42 },
          { h: 40, s: 75, l: 40 },
          { h: 15, s: 70, l: 45 },
          { h: 35, s: 85, l: 38 },
          { h: 45, s: 72, l: 44 },
        ],
        preview: ['#c2410c', '#a16207', '#b45309', '#92400e', '#a3730c']
      },
      mint: {
        colors: [
          { h: 168, s: 70, l: 40 },
          { h: 158, s: 65, l: 42 },
          { h: 175, s: 72, l: 38 },
          { h: 165, s: 68, l: 44 },
          { h: 155, s: 62, l: 40 },
        ],
        preview: ['#0d9488', '#059669', '#0f766e', '#10b981', '#047857']
      },
      twilight: {
        colors: [
          { h: 245, s: 65, l: 48 },
          { h: 260, s: 60, l: 45 },
          { h: 230, s: 70, l: 50 },
          { h: 275, s: 55, l: 46 },
          { h: 250, s: 62, l: 52 },
        ],
        preview: ['#5b21b6', '#7c3aed', '#4338ca', '#8b5cf6', '#6366f1']
      },
      coffee: {
        colors: [
          { h: 30, s: 50, l: 35 },
          { h: 25, s: 55, l: 38 },
          { h: 20, s: 45, l: 40 },
          { h: 35, s: 52, l: 36 },
          { h: 28, s: 48, l: 42 },
        ],
        preview: ['#78350f', '#92400e', '#854d0e', '#713f12', '#a16207']
      },
      monochrome: {
        colors: [
          { h: 215, s: 20, l: 35 },
          { h: 215, s: 18, l: 40 },
          { h: 215, s: 22, l: 32 },
          { h: 215, s: 16, l: 45 },
          { h: 215, s: 24, l: 38 },
        ],
        preview: ['#475569', '#64748b', '#334155', '#94a3b8', '#4b5563']
      },
    };

    // Current settings
    let currentSettings = {
      fixationPoint: ${settings.fixationPoint},
      opacity: ${settings.opacity},
      gradientTheme: '${settings.gradientTheme}',
      fontSize: ${settings.fontSize},
      lineHeight: ${settings.lineHeight},
    };

    // Store current markdown
    let currentMarkdown = '';

    const vscode = acquireVsCodeApi();
    const preview = document.getElementById('preview');

    // Get toolbar elements
    const fixationInput = document.getElementById('fixation');
    const fixationValue = document.getElementById('fixation-value');
    const opacityInput = document.getElementById('opacity');
    const opacityValue = document.getElementById('opacity-value');
    const gradientSelect = document.getElementById('gradient');
    const gradientPreview = document.getElementById('gradient-preview');
    const fontSizeInput = document.getElementById('fontSize');
    const fontSizeValue = document.getElementById('fontSize-value');
    const lineHeightInput = document.getElementById('lineHeight');
    const lineHeightValue = document.getElementById('lineHeight-value');

    // Initialize gradient select
    gradientSelect.value = currentSettings.gradientTheme;
    updateGradientPreview(currentSettings.gradientTheme);

    // Toolbar toggle
    const toolbar = document.getElementById('toolbar');
    const toolbarToggle = document.getElementById('toolbar-toggle');

    toolbarToggle.addEventListener('click', () => {
      toolbar.classList.toggle('hidden');
      toolbarToggle.classList.toggle('collapsed');
    });

    // Toolbar event listeners
    fixationInput.addEventListener('input', (e) => {
      currentSettings.fixationPoint = parseInt(e.target.value);
      fixationValue.textContent = currentSettings.fixationPoint;
      render();
    });

    opacityInput.addEventListener('input', (e) => {
      const percent = parseInt(e.target.value);
      currentSettings.opacity = percent / 100;
      opacityValue.textContent = percent + '%';
      render();
    });

    gradientSelect.addEventListener('change', (e) => {
      currentSettings.gradientTheme = e.target.value;
      updateGradientPreview(e.target.value);
      render();
    });

    fontSizeInput.addEventListener('input', (e) => {
      currentSettings.fontSize = parseInt(e.target.value);
      fontSizeValue.textContent = currentSettings.fontSize;
      render();
    });

    lineHeightInput.addEventListener('input', (e) => {
      currentSettings.lineHeight = parseFloat(e.target.value);
      lineHeightValue.textContent = currentSettings.lineHeight.toFixed(1);
      render();
    });

    function updateGradientPreview(themeName) {
      const theme = GRADIENT_THEMES[themeName];
      gradientPreview.innerHTML = '';
      if (theme && theme.preview && theme.preview.length > 0) {
        theme.preview.forEach(color => {
          const dot = document.createElement('span');
          dot.className = 'gradient-dot';
          dot.style.backgroundColor = color;
          gradientPreview.appendChild(dot);
        });
      }
    }

    // Simple markdown parser (basic implementation)
    function parseMarkdown(md) {
      let html = md
        // Escape HTML
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

        // Code blocks (before other processing)
        .replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>')
        .replace(/\`([^\`]+)\`/g, '<code>$1</code>')

        // Headers
        .replace(/^###### (.*$)/gm, '<h6>$1</h6>')
        .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
        .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')

        // Bold and italic
        .replace(/\\*\\*\\*(.+?)\\*\\*\\*/g, '<strong><em>$1</em></strong>')
        .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
        .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
        .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        .replace(/_(.+?)_/g, '<em>$1</em>')

        // Strikethrough
        .replace(/~~(.+?)~~/g, '<del>$1</del>')

        // Links and images
        .replace(/!\\[([^\\]]*)\\]\\(([^)]+)\\)/g, '<img src="$2" alt="$1">')
        .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2">$1</a>')

        // Blockquotes
        .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')

        // Horizontal rules
        .replace(/^(---|\\*\\*\\*|___)$/gm, '<hr>')

        // Unordered lists
        .replace(/^[\\*\\-] (.*$)/gm, '<li>$1</li>')

        // Ordered lists
        .replace(/^\\d+\\. (.*$)/gm, '<li>$1</li>')

        // Paragraphs (double newlines)
        .replace(/\\n\\n+/g, '</p><p>')

        // Single line breaks
        .replace(/\\n/g, '<br>');

      // Wrap in paragraph if needed
      if (!html.startsWith('<')) {
        html = '<p>' + html + '</p>';
      }

      // Clean up consecutive blockquotes
      html = html.replace(/<\\/blockquote><blockquote>/g, '<br>');

      // Wrap lists
      html = html.replace(/(<li>.*<\\/li>)/gs, '<ul>$1</ul>');
      html = html.replace(/<\\/ul><ul>/g, '');

      return html;
    }

    // Apply bionic reading to text
    function applyBionicReading(text, fixationPoint) {
      const words = text.split(/(\\s+)/);
      return words.map(word => {
        if (!word.trim()) return word;

        // Calculate how many characters to bold
        const length = word.length;
        const boldLength = Math.min(
          Math.max(1, Math.ceil(length * (fixationPoint / 5))),
          length
        );

        const boldPart = word.slice(0, boldLength);
        const dimPart = word.slice(boldLength);

        if (dimPart) {
          return '<b>' + boldPart + '</b><span class="bionic-dim">' + dimPart + '</span>';
        }
        return '<b>' + boldPart + '</b>';
      }).join('');
    }

    // Process HTML with bionic reading
    function processBionic(html, fixationPoint) {
      const skipTags = ['CODE', 'PRE', 'A', 'SCRIPT', 'STYLE'];
      const container = document.createElement('div');
      container.innerHTML = html;

      function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          const parent = node.parentElement;
          if (parent && skipTags.includes(parent.tagName)) {
            return;
          }

          const wrapper = document.createElement('span');
          wrapper.innerHTML = applyBionicReading(node.textContent, fixationPoint);
          node.parentNode.replaceChild(wrapper, node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (!skipTags.includes(node.tagName)) {
            Array.from(node.childNodes).forEach(processNode);
          }
        }
      }

      Array.from(container.childNodes).forEach(processNode);
      return container.innerHTML;
    }

    // Apply gradient colors to lines
    function applyGradient(container, themeName) {
      const theme = GRADIENT_THEMES[themeName];
      if (!theme || !theme.colors) return;

      // Detect if dark theme
      const bodyStyles = getComputedStyle(document.body);
      const bgColor = bodyStyles.getPropertyValue('--vscode-editor-background');
      const isDark = bgColor.includes('rgb') ?
        bgColor.match(/\\d+/g).reduce((a, b) => a + parseInt(b), 0) / 3 < 128 :
        true;

      // Adjust palette for theme
      const adjustedPalette = theme.colors.map(color => {
        const adjusted = { ...color };
        if (isDark) {
          adjusted.l = Math.min(75, Math.max(50, color.l + 15));
        } else {
          adjusted.l = Math.max(30, Math.min(50, color.l));
        }
        return adjusted;
      });

      // Get all text-containing elements
      const textElements = container.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, blockquote');
      let lineIndex = 0;

      textElements.forEach(element => {
        const color = adjustedPalette[lineIndex % adjustedPalette.length];
        element.style.color = 'hsl(' + color.h + ', ' + color.s + '%, ' + color.l + '%)';
        lineIndex++;
      });
    }

    // Render the preview
    function render() {
      if (!currentMarkdown) {
        preview.innerHTML = '<div class="empty-state"><p>Open a Markdown file to see the bionic preview</p></div>';
        return;
      }

      // Update CSS variables
      document.documentElement.style.setProperty('--font-size', currentSettings.fontSize + 'px');
      document.documentElement.style.setProperty('--line-height', currentSettings.lineHeight);
      document.documentElement.style.setProperty('--dim-opacity', currentSettings.opacity);

      // Parse markdown
      let html = parseMarkdown(currentMarkdown);

      // Apply bionic reading
      html = processBionic(html, currentSettings.fixationPoint);

      // Update preview
      preview.innerHTML = html;

      // Apply gradient if enabled
      if (currentSettings.gradientTheme !== 'none') {
        applyGradient(preview, currentSettings.gradientTheme);
      }
    }

    // Handle messages from the extension
    window.addEventListener('message', event => {
      const message = event.data;

      switch (message.type) {
        case 'update':
          currentMarkdown = message.content;
          render();
          break;

        case 'settings':
          currentSettings = { ...currentSettings, ...message.settings };
          // Update toolbar to match
          fixationInput.value = currentSettings.fixationPoint;
          fixationValue.textContent = currentSettings.fixationPoint;
          const opacityPercent = Math.round(currentSettings.opacity * 100);
          opacityInput.value = opacityPercent;
          opacityValue.textContent = opacityPercent + '%';
          gradientSelect.value = currentSettings.gradientTheme;
          updateGradientPreview(currentSettings.gradientTheme);
          fontSizeInput.value = currentSettings.fontSize;
          fontSizeValue.textContent = currentSettings.fontSize;
          lineHeightInput.value = currentSettings.lineHeight;
          lineHeightValue.textContent = currentSettings.lineHeight.toFixed(1);
          render();
          break;
      }
    });

    // Notify extension that webview is ready
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
