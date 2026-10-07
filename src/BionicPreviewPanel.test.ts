import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

const mock = vi.hoisted(() => {
  const callbacks: {message?: (message: unknown) => Promise<void>; disposed?: () => void} = {};
  const uri = (path: string) => ({path, toString: () => 'file://' + path});
  const webview = {html: '', options: {}, cspSource: 'https://webview.invalid', postMessage: vi.fn(),
    asWebviewUri: (value: ReturnType<typeof uri>) => ({toString: () => 'https://webview.invalid' + value.path}),
    onDidReceiveMessage: (handler: typeof callbacks.message) => {callbacks.message = handler; return {dispose: vi.fn()};},
  };
  const panel = {webview, title: '', reveal: vi.fn(), dispose: vi.fn(),
    onDidDispose: (handler: () => void) => {callbacks.disposed = handler; return {dispose: vi.fn()};},
  };
  const window: {activeTextEditor?: {document: unknown}; createWebviewPanel: ReturnType<typeof vi.fn>; showErrorMessage: ReturnType<typeof vi.fn>} = {
    createWebviewPanel: vi.fn(() => {window.activeTextEditor = undefined; return panel;}), showErrorMessage: vi.fn(),
  };
  const config = {get: vi.fn(), update: vi.fn(async () => {})};
  return {callbacks, uri, panel, webview, window, config};
});

vi.mock('vscode', () => ({
  window: mock.window,
  workspace: {getConfiguration: () => mock.config},
  ViewColumn: {Active: 1, Beside: 2}, ConfigurationTarget: {Global: 1},
  Uri: {joinPath: (uri: {path: string}, ...segments: string[]) => mock.uri([uri.path, ...segments].join('/'))},
}));
import { BionicPreviewPanel } from './BionicPreviewPanel';

const document = (path: string, text: string) => ({uri: mock.uri(path), fileName: path, languageId: 'markdown', getText: () => text});

beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); mock.config.get.mockReturnValue(undefined); });
afterEach(() => {BionicPreviewPanel.currentPanel?.dispose(); vi.useRealTimers();});

describe('preview source lifecycle', () => {
  it('captures the source before opening the panel, then sends initial content only after ready', async () => {
    mock.window.activeTextEditor = {document: document('/notes/a.md', '# Source before focus changes')};
    BionicPreviewPanel.createOrShow(mock.uri('/extension') as never, 2);
    expect(mock.window.activeTextEditor).toBeUndefined();
    expect(mock.webview.postMessage).not.toHaveBeenCalled();
    await mock.callbacks.message!({type: 'ready'});
    expect(mock.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({type: 'update', html: expect.stringContaining('<h1>Source before focus changes</h1>')}));
  });
  it('updates the tracked source while the editor is inactive, ignoring unrelated documents', async () => {
    const source = document('/notes/a.md', 'original');
    mock.window.activeTextEditor = {document: source};
    BionicPreviewPanel.createOrShow(mock.uri('/extension') as never, 2);
    await mock.callbacks.message!({type:'ready'});
    mock.webview.postMessage.mockClear();
    BionicPreviewPanel.updateContent(document('/notes/other.md', 'unrelated') as never);
    vi.advanceTimersByTime(100);
    expect(mock.webview.postMessage).not.toHaveBeenCalled();
    BionicPreviewPanel.updateContent(document('/notes/a.md', 'updated') as never);
    vi.advanceTimersByTime(100);
    expect(mock.webview.postMessage).toHaveBeenCalledWith({type:'update', html:'<p>updated</p>'});
  });
  it('validates persisted settings and ignores unrecognized message keys', async () => {
    BionicPreviewPanel.createOrShow(mock.uri('/extension') as never, 2);
    await mock.callbacks.message!({type:'setting', key:'fontSize', value:1000});
    expect(mock.config.update).toHaveBeenCalledWith('fontSize', 32, 1);
    mock.config.update.mockClear();
    await mock.callbacks.message!({type:'setting', key:'__proto__', value:'attack'});
    expect(mock.config.update).not.toHaveBeenCalled();
  });
  it('resolves local images but never sends remote image URLs to the browser', async () => {
    mock.window.activeTextEditor = {document: document('/notes/a.md', '![local](image.png) ![remote](https://example.com/track.png)')};
    BionicPreviewPanel.createOrShow(mock.uri('/extension') as never, 2);
    await mock.callbacks.message!({type:'ready'});
    const update = mock.webview.postMessage.mock.calls.find(([message]) => message.type === 'update')![0];
    expect(update.html).toContain('https://webview.invalid/notes/a.md/../image.png');
    expect(update.html).not.toContain('https://example.com');
  });
  it('disposes idempotently and clears pending updates', async () => {
    mock.window.activeTextEditor = {document: document('/notes/a.md', 'source')};
    BionicPreviewPanel.createOrShow(mock.uri('/extension') as never, 2);
    await mock.callbacks.message!({type:'ready'});
    BionicPreviewPanel.updateContent(document('/notes/a.md', 'updated') as never);
    const panel = BionicPreviewPanel.currentPanel!;
    mock.webview.postMessage.mockClear();
    panel.dispose(); panel.dispose();
    vi.advanceTimersByTime(100);
    expect(mock.webview.postMessage).not.toHaveBeenCalled();
    expect(mock.panel.dispose).toHaveBeenCalledOnce();
  });
});
