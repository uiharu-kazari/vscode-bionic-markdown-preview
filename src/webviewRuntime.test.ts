// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { getWebviewContent } from './webviewContent';
import { parseMarkdown } from './markdownParser';
import { preprocessMath } from './mathPreprocessor';

function webview() {
  const messages: unknown[] = [];
  let state: unknown;
  const html = getWebviewContent({ cspSource: 'https://local.invalid' } as never,
    {fixationPoint: 3, opacity: 0.7, gradientTheme: 'none', fontSize: 16, lineHeight: 1.8}, 'katex.css');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', // Execute our generated webview script; no resource loading enabled.
    beforeParse(window) {
      Object.assign(window, {acquireVsCodeApi: () => ({
        postMessage: (message: unknown) => messages.push(message),
        getState: () => state, setState: (next: unknown) => {state = next;},
      })});
    },
  });
  return {dom, messages, getState: () => state};
}

describe('actual generated webview script', () => {
  it('signals readiness and renders host Markdown, code and accessible math', () => {
    const view = webview();
    expect(view.messages).toContainEqual({type: 'ready'});
    const math = preprocessMath('# Heading\n\nEnergy $E=mc^2$\n\n```\nuntouched\n```\n\n| A | B |\n|---|---|\n| text | data |');
    view.dom.window.dispatchEvent(new view.dom.window.MessageEvent('message', {data: {
      type: 'update', html: parseMarkdown(math.processed, math.mathRendered),
    }}));
    const root = view.dom.window.document;
    expect(root.querySelector('h1 b')).not.toBeNull();
    expect(root.querySelectorAll('td')).toHaveLength(2);
    expect(root.querySelector('math')).not.toBeNull();
    expect(root.querySelector('pre b')).toBeNull();
    const malicious = parseMarkdown('![\" onerror=\"alert(1)](image.png)');
    view.dom.window.dispatchEvent(new view.dom.window.MessageEvent('message', {data: {type: 'update', html: malicious}}));
    expect(root.querySelector('img')!.hasAttribute('onerror')).toBe(false);
    expect(root.querySelector('.katex b')).toBeNull();
    view.dom.window.close();
  });
  it('persists toolbar settings through the extension message and exposes collapse state', () => {
    const view = webview();
    const input = view.dom.window.document.querySelector<HTMLInputElement>('#fontSize')!;
    input.value = '30';
    input.dispatchEvent(new view.dom.window.Event('input'));
    input.dispatchEvent(new view.dom.window.Event('change'));
    expect(view.messages).toContainEqual({type: 'setting', key: 'fontSize', value: 30});
    const toggle = view.dom.window.document.querySelector<HTMLButtonElement>('#toolbar-toggle')!;
    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(view.getState()).toEqual({toolbarCollapsed: true});
    view.dom.window.close();
  });
  it('uses VS Code light and high-contrast classes when applying gradient colors', () => {
    const view = webview();
    const doc = view.dom.window.document;
    doc.body.className = 'vscode-high-contrast';
    view.dom.window.dispatchEvent(new view.dom.window.MessageEvent('message', {data: {type:'settings', settings: {gradientTheme:'ocean'}}}));
    view.dom.window.dispatchEvent(new view.dom.window.MessageEvent('message', {data: {type:'update', html: '<p>Reading</p>'}}));
    expect(doc.querySelector<HTMLParagraphElement>('#preview p')!.style.color).toBe('');
    doc.body.className = 'vscode-light';
    view.dom.window.dispatchEvent(new view.dom.window.MessageEvent('message', {data: {type:'update', html: '<p>Reading</p>'}}));
    expect(doc.querySelector<HTMLParagraphElement>('#preview p')!.style.color).not.toBe('');
    view.dom.window.close();
  });
});
