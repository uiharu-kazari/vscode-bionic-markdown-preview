import * as vscode from 'vscode';
import katex from 'katex';
import { getWebviewContent } from './webviewContent';

interface MathRendered {
  id: string;
  html: string;
  display: boolean;
}

/**
 * Extract math expressions from markdown, render with KaTeX, and replace with placeholders.
 */
function preprocessMath(markdown: string): { processed: string; mathRendered: MathRendered[] } {
  const mathRendered: MathRendered[] = [];
  let processed = markdown;

  // Protect code blocks and inline code
  const codeProtections: Array<{ placeholder: string; original: string }> = [];

  processed = processed.replace(/(?:```|~~~)[\s\S]*?(?:```|~~~)/g, (match) => {
    const placeholder = `\x00CODE${codeProtections.length}\x00`;
    codeProtections.push({ placeholder, original: match });
    return placeholder;
  });

  processed = processed.replace(/`[^`]+`/g, (match) => {
    const placeholder = `\x00CODE${codeProtections.length}\x00`;
    codeProtections.push({ placeholder, original: match });
    return placeholder;
  });

  const renderMath = (math: string, display: boolean): string => {
    const id = `MATHBLOCK${mathRendered.length}ENDMATH`;
    try {
      const html = katex.renderToString(math.trim(), {
        displayMode: display,
        throwOnError: false,
        output: 'html',
        trust: true,
        strict: false,
        macros: {
          '\\R': '\\mathbb{R}',
          '\\N': '\\mathbb{N}',
          '\\Z': '\\mathbb{Z}',
          '\\Q': '\\mathbb{Q}',
          '\\C': '\\mathbb{C}',
        },
      });
      mathRendered.push({ id, html, display });
    } catch {
      mathRendered.push({ id, html: `<code>${math.trim()}</code>`, display });
    }
    return id;
  };

  // Display math: \[...\]
  processed = processed.replace(/\\\[([\s\S]+?)\\\]/g, (_, math) => renderMath(math, true));

  // Display math: \begin{...}...\end{...}
  processed = processed.replace(/\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g, (match, env, body) => {
    return renderMath(match, true);
  });

  // Display math: $$...$$
  processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => renderMath(math, true));

  // Inline math: \(...\)
  processed = processed.replace(/\\\(([\s\S]+?)\\\)/g, (_, math) => renderMath(math, false));

  // Inline math: $...$ (must contain a letter or backslash)
  processed = processed.replace(/(?<![\\$])\$(?!\s)([^\$\n]*[a-zA-Z\\][^\$\n]*?)(?<!\s)\$(?!\$)/g, (_, math) => renderMath(math, false));

  // Restore code blocks (use function replacement to avoid $ special patterns)
  for (const { placeholder, original } of codeProtections) {
    processed = processed.replace(placeholder, () => original);
  }

  return { processed, mathRendered };
}

export class BionicPreviewPanel {
  public static currentPanel: BionicPreviewPanel | undefined;
  private static readonly viewType = 'bionicPreview';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, column: vscode.ViewColumn) {
    // If we already have a panel, show it
    if (BionicPreviewPanel.currentPanel) {
      BionicPreviewPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      BionicPreviewPanel.viewType,
      'Bionic Preview',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media'),
          vscode.Uri.joinPath(extensionUri, 'node_modules', 'katex', 'dist'),
        ],
      }
    );

    BionicPreviewPanel.currentPanel = new BionicPreviewPanel(panel, extensionUri);

    // Send initial content if there's an active markdown editor
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.languageId === 'markdown') {
      BionicPreviewPanel.updateContent(activeEditor.document.getText());
    }
  }

  public static updateContent(markdown: string) {
    if (BionicPreviewPanel.currentPanel) {
      const { processed, mathRendered } = preprocessMath(markdown);
      BionicPreviewPanel.currentPanel._panel.webview.postMessage({
        type: 'update',
        content: processed,
        mathRendered,
      });
    }
  }

  public static updateSettings() {
    if (BionicPreviewPanel.currentPanel) {
      const config = vscode.workspace.getConfiguration('bionicPreview');
      BionicPreviewPanel.currentPanel._panel.webview.postMessage({
        type: 'settings',
        settings: {
          fixationPoint: config.get('fixationPoint', 3),
          opacity: config.get('opacity', 0.7),
          gradientTheme: config.get('gradientTheme', 'none'),
          fontSize: config.get('fontSize', 16),
          lineHeight: config.get('lineHeight', 1.8),
        },
      });
    }
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set initial HTML content
    this._update();

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.type) {
          case 'ready':
            // Webview is ready, send initial settings
            BionicPreviewPanel.updateSettings();
            break;
          case 'error':
            vscode.window.showErrorMessage(`Bionic Preview: ${message.error}`);
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public dispose() {
    BionicPreviewPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private _update() {
    const webview = this._panel.webview;
    const config = vscode.workspace.getConfiguration('bionicPreview');

    const katexCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'katex', 'dist', 'katex.min.css')
    );

    this._panel.webview.html = getWebviewContent(webview, {
      fixationPoint: config.get('fixationPoint', 3),
      opacity: config.get('opacity', 0.7),
      gradientTheme: config.get('gradientTheme', 'none'),
      fontSize: config.get('fontSize', 16),
      lineHeight: config.get('lineHeight', 1.8),
    }, katexCssUri.toString());
  }
}
