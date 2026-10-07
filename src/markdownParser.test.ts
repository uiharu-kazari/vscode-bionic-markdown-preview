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
    expect(html).toMatch(/<th>\s*<strong>bold<\/strong><\/th>/);
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
    expect(parseMarkdown('~~s~~')).toContain('<s>s</s>');
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
    expect(parseMarkdown('> quoted')).toMatch(/<blockquote>\s*<p>quoted<\/p>\s*<\/blockquote>/);
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
    expect(html).toContain('<span class="math-display"><span>y</span></span>');
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


describe('safe Markdown and CommonMark behavior', () => {
  it('cannot inject event attributes through a link destination or image alt text', () => {
    for (const md of ['[open](https://example.com/"onclick="alert)', '![" onerror="alert(1)](image.png)']) {
      const html = parseMarkdown(md);
      expect(html).not.toMatch(/(?:href|src)="[^"]*"\s+(?:onerror|onclick)=/);
      expect(html).not.toMatch(/alt=""/);
    }
  });
  it('rejects JavaScript, data HTML, and command links', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,test', 'vbscript:msgbox(1)', 'command:workbench.action.files.openFile', 'file:///etc/passwd']) {
      expect(parseMarkdown(`[open](${url})`)).not.toContain('<a href=');
    }
  });
  it('supports nested lists, reference links, and literal underscores', () => {
    const html = parseMarkdown('- parent\n  - child\n\n[link][ref]\n\n[ref]: https://example.com\n\nfile_name_here');
    expect((html.match(/<ul>/g) || [])).toHaveLength(2);
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('file_name_here');
  });
  it('requires a separator row for a table and accepts tables without outer pipes', () => {
    expect(parseMarkdown('| ordinary | prose |')).not.toContain('<table>');
    expect(parseMarkdown('Name | Age\n--- | ---\nAlice | 30')).toContain('<table>');
  });
  it('preserves tilde fences and multi-backtick inline code', () => {
    const html = parseMarkdown('~~~ts\n**literal**\n~~~\n\n``a ` b``');
    expect(html).toContain('**literal**');
    expect(html).toContain('<code>a ` b</code>');
  });
  it('never restores math inside code or image attributes', () => {
    const math = [{ id: 'MATHBLOCK0ENDMATH', html: '<span class="katex">x</span>', display: false }];
    const html = parseMarkdown('`MATHBLOCK0ENDMATH` ![MATHBLOCK0ENDMATH](MATHBLOCK0ENDMATH)', math);
    expect(html).not.toContain('class="katex"');
  });
});
