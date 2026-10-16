import * as vscode from 'vscode';
import { getWebviewContent } from './webviewContent';
import { preprocessMath } from './mathPreprocessor';
import { parseMarkdown } from './markdownParser';
import { normalizeSettings, type PreviewSettings } from './previewSettings';

export class BionicPreviewPanel {
  public static currentPanel: BionicPreviewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _document: vscode.TextDocument | undefined;
  private _ready = false;
  private _disposed = false;
  private _updateTimer: ReturnType<typeof setTimeout> | undefined;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, column: vscode.ViewColumn) {
    // Creating/revealing a webview changes activeTextEditor, so capture its source first.
    const document = vscode.window.activeTextEditor?.document;
    if (BionicPreviewPanel.currentPanel) {
      if (document?.languageId === 'markdown') BionicPreviewPanel.currentPanel.setDocument(document);
      BionicPreviewPanel.currentPanel._panel.reveal(column);
      return;
    }
    const panel = vscode.window.createWebviewPanel('bionicPreview', 'Bionic Preview', column, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
    });
    panel.iconPath = vscode.Uri.joinPath(extensionUri, 'media', 'icon.svg');
    BionicPreviewPanel.currentPanel = new BionicPreviewPanel(panel, extensionUri,
      document?.languageId === 'markdown' ? document : undefined);
  }

  public static setDocument(document: vscode.TextDocument) {
    BionicPreviewPanel.currentPanel?.setDocument(document);
  }

  public static updateContent(document: vscode.TextDocument) {
    const current = BionicPreviewPanel.currentPanel;
    // Continue updating the tracked file even while the preview itself has focus.
    if (current?._document?.uri.toString() !== document.uri.toString()) return;
    current._document = document;
    if (current._updateTimer) clearTimeout(current._updateTimer);
    current._updateTimer = setTimeout(() => current.sendContent(), 100);
  }

  public static updateSettings() {
    const current = BionicPreviewPanel.currentPanel;
    if (current?._ready) void current._panel.webview.postMessage({ type: 'settings', settings: current.settings() });
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, document?: vscode.TextDocument) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._document = document;
    if (document) this._panel.title = `Bionic: ${document.fileName.split(/[\\/]/).pop()}`;
    this.setResourceRoots();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(async (message: unknown) => {
      if (!message || typeof message !== 'object') return;
      const data = message as { type?: string; key?: keyof PreviewSettings; value?: unknown };
      if (data.type === 'ready') {
        this._ready = true;
        BionicPreviewPanel.updateSettings();
        this.sendContent();
      } else if (data.type === 'setting' && data.key && Object.prototype.hasOwnProperty.call(this.settings(), data.key)) {
        const values = normalizeSettings({ ...this.settings(), [data.key]: data.value });
        try {
          await vscode.workspace.getConfiguration('bionicPreview').update(data.key, values[data.key], vscode.ConfigurationTarget.Global);
        } catch {
          void vscode.window.showErrorMessage('Bionic Preview could not save this reading setting.');
        }
      }
    }, null, this._disposables);
    const css = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'katex', 'katex.min.css'));
    this._panel.webview.html = getWebviewContent(this._panel.webview, this.settings(), css.toString());
  }

  private settings(): PreviewSettings {
    const config = vscode.workspace.getConfiguration('bionicPreview', this._document?.uri);
    return normalizeSettings({
      fixationPoint: config.get('fixationPoint'), opacity: config.get('opacity'),
      gradientTheme: config.get('gradientTheme'), fontSize: config.get('fontSize'), lineHeight: config.get('lineHeight'),
    });
  }

  private setDocument(document: vscode.TextDocument) {
    this._document = document;
    this.setResourceRoots();
    this._panel.title = `Bionic: ${document.fileName.split(/[\\/]/).pop()}`;
    BionicPreviewPanel.updateSettings();
    this.sendContent();
  }

  private setResourceRoots() {
    this._panel.webview.options = {
      ...this._panel.webview.options,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'media'),
        ...(this._document ? [vscode.Uri.joinPath(this._document.uri, '..')] : [])],
    };
  }

  private sendContent() {
    if (!this._ready || this._disposed || !this._document) return;
    const { processed, mathRendered } = preprocessMath(this._document.getText());
    const html = parseMarkdown(processed, mathRendered, src => {
      if (/^(https?:|data:)/i.test(src)) return ''; // Avoid unsolicited network requests from a local preview.
      if (/^[a-z][a-z\d+.-]*:/i.test(src) || !this._document) return '';
      if (src.startsWith('//')) return '';
      try {
        const image = vscode.Uri.joinPath(this._document.uri, '..', decodeURIComponent(src));
        return this._panel.webview.asWebviewUri(image).toString();
      } catch { return ''; }
    });
    void this._panel.webview.postMessage({ type: 'update', html });
  }

  public dispose() {
    if (this._disposed) return;
    this._disposed = true;
    if (BionicPreviewPanel.currentPanel === this) BionicPreviewPanel.currentPanel = undefined;
    if (this._updateTimer) clearTimeout(this._updateTimer);
    for (const disposable of this._disposables.splice(0)) disposable.dispose();
    this._panel.dispose();
  }
}
