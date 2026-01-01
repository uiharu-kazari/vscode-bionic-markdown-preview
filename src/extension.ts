import * as vscode from 'vscode';
import { BionicPreviewPanel } from './BionicPreviewPanel';

export function activate(context: vscode.ExtensionContext) {
  console.log('Bionic Markdown Preview is now active');

  // Command to open preview in current column
  context.subscriptions.push(
    vscode.commands.registerCommand('bionicPreview.open', () => {
      BionicPreviewPanel.createOrShow(context.extensionUri, vscode.ViewColumn.Active);
    })
  );

  // Command to open preview to the side
  context.subscriptions.push(
    vscode.commands.registerCommand('bionicPreview.openToSide', () => {
      BionicPreviewPanel.createOrShow(context.extensionUri, vscode.ViewColumn.Beside);
    })
  );

  // Auto-update preview when active markdown editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.languageId === 'markdown') {
        BionicPreviewPanel.updateContent(editor.document.getText());
      }
    })
  );

  // Auto-update preview when document text changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (
        activeEditor &&
        event.document === activeEditor.document &&
        event.document.languageId === 'markdown'
      ) {
        BionicPreviewPanel.updateContent(event.document.getText());
      }
    })
  );

  // Update on configuration change
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('bionicPreview')) {
        BionicPreviewPanel.updateSettings();
      }
    })
  );
}

export function deactivate() {
  // Clean up
}
