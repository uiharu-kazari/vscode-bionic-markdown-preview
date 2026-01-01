import * as vscode from 'vscode';
import { getWebviewContent } from './webviewContent';

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
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
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
      BionicPreviewPanel.currentPanel._panel.webview.postMessage({
        type: 'update',
        content: markdown,
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

    this._panel.webview.html = getWebviewContent(webview, {
      fixationPoint: config.get('fixationPoint', 3),
      opacity: config.get('opacity', 0.7),
      gradientTheme: config.get('gradientTheme', 'none'),
      fontSize: config.get('fontSize', 16),
      lineHeight: config.get('lineHeight', 1.8),
    });
  }
}
