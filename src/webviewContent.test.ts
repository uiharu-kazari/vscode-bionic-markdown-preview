// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { parseMarkdown, applyBionicText } from './markdownParser';
import { preprocessMath } from './mathPreprocessor';
import { getWebviewContent, type PreviewSettings } from './webviewContent';

const SETTINGS: PreviewSettings = {
  fixationPoint: 3,
  opacity: 0.7,
  gradientTheme: 'none',
  fontSize: 16,
  lineHeight: 1.8,
};

// Faithful copy of the webview's processBionic DOM glue, so the integration
// test exercises the same pipeline the panel runs (parse → DOM → bionic).
function processBionic(html: string, fixationPoint: number): string {
  const skipTags = ['CODE', 'PRE', 'A', 'SCRIPT', 'STYLE', 'MATH'];
  const skipClasses = ['math-inline', 'math-display', 'katex'];
  const container = document.createElement('div');
  container.innerHTML = html;

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim()) {
      const parent = node.parentElement;
      if (parent && skipTags.includes(parent.tagName)) {
        return;
      }
      const wrapper = document.createElement('span');
      wrapper.innerHTML = applyBionicText(node.textContent, fixationPoint);
      node.parentNode!.replaceChild(wrapper, node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (
        !skipTags.includes(el.tagName) &&
        !skipClasses.some((c) => el.classList.contains(c))
      ) {
        Array.from(node.childNodes).forEach(walk);
      }
    }
  }

  Array.from(container.childNodes).forEach(walk);
  return container.innerHTML;
}

describe('content pipeline (preprocessMath → parseMarkdown → DOM)', () => {
  it('renders a GFM table into real table elements in the DOM', () => {
    const md = '| Name | Age |\n| --- | --- |\n| Alice | 30 |';
    const { processed, mathRendered } = preprocessMath(md);
    const html = parseMarkdown(processed, mathRendered);

    const root = document.createElement('div');
    root.innerHTML = html;

    const table = root.querySelector('table');
    expect(table).not.toBeNull();
    expect(root.querySelectorAll('thead th').length).toBe(2);
    expect(root.querySelectorAll('tbody td').length).toBe(2);
    expect(root.querySelector('thead th')!.textContent).toBe('Name');
    expect(root.querySelector('tbody td')!.textContent).toBe('Alice');
  });

  it('resolves rendered math into the DOM alongside prose', () => {
    const md = 'Energy is $E = mc^2$ today.';
    const { processed, mathRendered } = preprocessMath(md);
    const html = parseMarkdown(processed, mathRendered);
    const root = document.createElement('div');
    root.innerHTML = html;
    expect(root.querySelector('.math-inline')).not.toBeNull();
    expect(root.querySelector('.katex')).not.toBeNull();
  });

  it('applies bionic emphasis to table cell text but not to code', () => {
    const md =
      '| Word | Note |\n| --- | --- |\n| reading | text |\n\n```\ncode line\n```';
    const html = parseMarkdown(md);
    const bionic = processBionic(html, 3);

    const root = document.createElement('div');
    root.innerHTML = bionic;

    // cells get bionic <b> emphasis
    const cellBolds = root.querySelectorAll('td b, th b');
    expect(cellBolds.length).toBeGreaterThan(0);

    // code block text is left untouched (no <b> inside <pre><code>)
    expect(root.querySelectorAll('pre code b').length).toBe(0);
    expect(root.querySelector('pre code')!.textContent).toContain('code line');
  });
});

describe('getWebviewContent', () => {
  const fakeWebview = { cspSource: 'vscode-resource:' } as never;

  it('ships the fixed parser (with table handling) into the webview HTML', () => {
    const html = getWebviewContent(fakeWebview, SETTINGS, 'katex.css');
    // the injected parser source is present in the page
    expect(html).toContain('processTables');
    expect(html).toContain('<thead>');
    // and the table CSS the parser output relies on
    expect(html).toContain('th, td');
  });

  it('embeds the current settings and a CSP nonce', () => {
    const html = getWebviewContent(fakeWebview, { ...SETTINGS, fontSize: 22 }, 'katex.css');
    expect(html).toContain('--font-size: 22px');
    expect(html).toMatch(/nonce-[A-Za-z0-9]{32}/);
    expect(html).toContain('katex.css');
  });
});
