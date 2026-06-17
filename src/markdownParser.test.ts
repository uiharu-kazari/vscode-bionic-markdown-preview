import { describe, it, expect } from 'vitest';
import { parseMarkdown, applyBionicText } from './markdownParser';

describe('parseMarkdown — GFM tables (the regression this module fixes)', () => {
  const TABLE = [
    '| Name | Age |',
    '| --- | --- |',
    '| Alice | 30 |',
    '| Bob | 25 |',
  ].join('\n');

  it('renders a pipe table to a real <table> with header and body', () => {
    const html = parseMarkdown(TABLE);
    expect(html).toContain('<table>');
    expect(html).toContain('</table>');
    expect(html).toContain('<thead>');
    expect(html).toContain('<tbody>');
  });

  it('puts the first row in <th> and data rows in <td>', () => {
    const html = parseMarkdown(TABLE);
    expect(html).toContain('<th>Name</th>');
    expect(html).toContain('<th>Age</th>');
    expect(html).toContain('<td>Alice</td>');
    expect(html).toContain('<td>30</td>');
    expect(html).toContain('<td>Bob</td>');
  });

  it('drops the |---| alignment separator row (no literal dashes leak)', () => {
    const html = parseMarkdown(TABLE);
    expect(html).not.toContain('---');
    expect(html).not.toContain('<td>---</td>');
  });

  it('does NOT wrap table text in a stray paragraph (the old bug)', () => {
    const html = parseMarkdown(TABLE);
    // Before the fix the whole table fell through to <p>| Name | Age |…</p>
    expect(html).not.toMatch(/<p>\s*\| Name/);
    expect(html).not.toContain('| Name | Age |');
  });

  it('closes the table when normal text follows', () => {
    const html = parseMarkdown(TABLE + '\n\nAfter the table.');
    expect(html).toContain('</table>');
    expect(html).toContain('<p>After the table.</p>');
  });

  it('applies inline formatting inside cells', () => {
    const html = parseMarkdown('| **bold** | a |\n| --- | --- |\n| x | y |');
    expect(html).toContain('<th><strong>bold</strong></th>');
  });
});

describe('parseMarkdown — core blocks', () => {
  it('renders headings h1–h6', () => {
    expect(parseMarkdown('# H1')).toContain('<h1>H1</h1>');
    expect(parseMarkdown('###### H6')).toContain('<h6>H6</h6>');
  });

  it('renders bold, italic and strikethrough', () => {
    expect(parseMarkdown('**b**')).toContain('<strong>b</strong>');
    expect(parseMarkdown('*i*')).toContain('<em>i</em>');
    expect(parseMarkdown('~~s~~')).toContain('<del>s</del>');
  });

  it('renders unordered and ordered lists', () => {
    const ul = parseMarkdown('- one\n- two');
    expect(ul).toContain('<ul>');
    expect(ul).toContain('<li>one</li>');
    const ol = parseMarkdown('1. first\n2. second');
    expect(ol).toContain('<ol>');
    expect(ol).toContain('<li>first</li>');
  });

  it('renders links and images', () => {
    expect(parseMarkdown('[t](http://x)')).toContain('<a href="http://x">t</a>');
    expect(parseMarkdown('![a](http://img)')).toContain('<img src="http://img" alt="a">');
  });

  it('renders blockquotes', () => {
    expect(parseMarkdown('> quoted')).toContain('<blockquote>quoted</blockquote>');
  });

  it('escapes raw HTML in body text so it cannot inject markup', () => {
    const html = parseMarkdown('a <script>alert(1)</script> b');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('protects fenced code blocks and inline code (no formatting/escaping bleed)', () => {
    const fenced = parseMarkdown('```\n**not bold** <x>\n```');
    expect(fenced).toContain('<pre><code>');
    expect(fenced).toContain('**not bold**'); // not turned into <strong>
    expect(fenced).toContain('&lt;x&gt;');

    const inline = parseMarkdown('use `**raw**` here');
    expect(inline).toContain('<code>**raw**</code>');
  });

  it('wraps plain prose in a paragraph', () => {
    expect(parseMarkdown('just some text')).toBe('<p>just some text</p>');
  });

  it('returns empty string for empty input', () => {
    expect(parseMarkdown('')).toBe('');
  });
});

describe('parseMarkdown — math placeholders', () => {
  it('substitutes inline and display math HTML at placeholder ids', () => {
    const math = [
      { id: 'MATHBLOCK0ENDMATH', html: '<span>x</span>', display: false },
      { id: 'MATHBLOCK1ENDMATH', html: '<span>y</span>', display: true },
    ];
    const html = parseMarkdown('inline MATHBLOCK0ENDMATH\n\nMATHBLOCK1ENDMATH', math);
    expect(html).toContain('<span class="math-inline"><span>x</span></span>');
    expect(html).toContain('<div class="math-display"><span>y</span></div>');
    // display math placeholder is not left wrapped in a paragraph
    expect(html).not.toMatch(/<p>\s*<div class="math-display"/);
  });
});

describe('applyBionicText', () => {
  it('bolds the leading portion of each word and dims the rest', () => {
    const out = applyBionicText('reading', 3);
    expect(out).toMatch(/^<b>rea?<\/b>/); // floor(7*3/6)=3 → "rea"
    expect(out).toContain('<span class="bionic-dim">');
  });

  it('preserves the whitespace between words', () => {
    const out = applyBionicText('two words', 3);
    expect(out).toContain(' '); // the separating space survives
    expect((out.match(/<b>/g) || []).length).toBe(2);
  });

  it('higher fixation point bolds at least as many characters', () => {
    const boldLen = (s: string) => (s.match(/<b>(.*?)<\/b>/)?.[1] ?? '').length;
    expect(boldLen(applyBionicText('information', 5))).toBeGreaterThanOrEqual(
      boldLen(applyBionicText('information', 1))
    );
  });

  it('escapes HTML inside the processed word', () => {
    const out = applyBionicText('a<b', 3);
    expect(out).not.toContain('<b>a<b');
    expect(out).toContain('&lt;');
  });
});
