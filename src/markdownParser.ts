/**
 * Markdown → HTML for the Bionic Preview webview.
 *
 * This is the single source of truth for parsing. `webviewContent.ts` injects
 * these functions into the webview via `.toString()`, so the exact code unit
 * tested here is what runs in the panel. Both functions are therefore written
 * to be **self-contained** (no module-scope references) — nested helpers only,
 * no imports — so serialising them keeps them whole.
 *
 * The previous inline parser had no table handling at all, so GFM tables fell
 * through to paragraph text and never rendered. `parseMarkdown` now recognises
 * pipe tables (the CSS for <table>/<th>/<td> was already present).
 */

interface MathRendered {
  id: string;
  html: string;
  display: boolean;
}

export function parseMarkdown(md: string, mathRendered?: MathRendered[]): string {
  if (!md) {
    return '';
  }

  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  let text = md.replace(/\r\n/g, '\n');

  // 1. Math placeholders (pre-rendered KaTeX HTML, restored verbatim at the end)
  const mathPlaceholders: Array<{ placeholder: string; html: string }> = [];
  if (mathRendered && mathRendered.length > 0) {
    for (const m of mathRendered) {
      if (text.includes(m.id)) {
        const placeholder = '%%MATH_' + mathPlaceholders.length + '%%';
        const wrapper = m.display
          ? '<div class="math-display">' + m.html + '</div>'
          : '<span class="math-inline">' + m.html + '</span>';
        mathPlaceholders.push({ placeholder, html: wrapper });
        text = text.replace(m.id, placeholder);
      }
    }
  }

  // 2. Fenced code blocks (protected from every other transform)
  const codeBlocks: string[] = [];
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, lang, code) => {
    const escaped = escapeHtml(String(code).replace(/\n$/, ''));
    const langClass = lang ? ' class="language-' + lang + '"' : '';
    const ph = '%%CODEBLOCK_' + codeBlocks.length + '%%';
    codeBlocks.push('<pre><code' + langClass + '>' + escaped + '</code></pre>');
    return ph;
  });

  // 3. Inline code
  const inlineCodes: string[] = [];
  text = text.replace(/`([^`]+)`/g, (_match, code) => {
    const ph = '%%INLINECODE_' + inlineCodes.length + '%%';
    inlineCodes.push('<code>' + escapeHtml(String(code)) + '</code>');
    return ph;
  });

  // 4. Escape the remaining raw text, then build real tags on top of it
  let html = escapeHtml(text);

  html = html
    // Headers
    .replace(/^######\s+(.*)$/gm, '<h6>$1</h6>')
    .replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>')
    .replace(/^####\s+(.*)$/gm, '<h4>$1</h4>')
    .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>')
    // Horizontal rules
    .replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr>')
    // Bold / italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // Images (before links)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Blockquotes — the leading '>' has already been escaped to '&gt;' above
    .replace(/^&gt;\s+(.*)$/gm, '<blockquote>$1</blockquote>')
    .replace(/<\/blockquote>\n<blockquote>/g, '\n');

  // 5. Block structure — line based, so tables/lists keep their row geometry.
  html = processTables(html);
  html = processList(html, /^[*\-+]\s+(.+)$/, 'ul');
  html = processList(html, /^\d+\.\s+(.+)$/, 'ol');
  html = wrapParagraphs(html);

  // 6. Restore protected content (function replacements avoid $-pattern issues)
  codeBlocks.forEach((block, i) => {
    html = html.replace('%%CODEBLOCK_' + i + '%%', () => block);
  });
  inlineCodes.forEach((code, i) => {
    html = html.replace('%%INLINECODE_' + i + '%%', () => code);
  });
  mathPlaceholders.forEach((m) => {
    // Display math may have been wrapped in a paragraph by wrapParagraphs
    html = html.replace('<p>' + m.placeholder + '</p>', () => m.html);
    html = html.replace(m.placeholder, () => m.html);
  });

  return html;

  // ---- nested helpers (kept inside so the function serialises whole) ----

  function processTables(input: string): string {
    const lines = input.split('\n');
    const result: string[] = [];
    let inTable = false;
    let headerDone = false;

    const isRow = (l: string) => l.startsWith('|') && l.endsWith('|');
    const isSeparator = (l: string) => /^\|[\s\-:|]+\|$/.test(l);

    const closeTable = () => {
      if (inTable) {
        if (headerDone) {
          result.push('</tbody>');
        }
        result.push('</table>');
        inTable = false;
      }
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (isRow(line)) {
        if (isSeparator(line)) {
          continue; // alignment row — drop it
        }
        if (!inTable) {
          result.push('<table>');
          result.push('<thead>');
          inTable = true;
          headerDone = false;
        }
        const cells = line.split('|').slice(1, -1).map((c) => c.trim());
        const tag = headerDone ? 'td' : 'th';
        result.push('<tr>');
        cells.forEach((c) => result.push('<' + tag + '>' + c + '</' + tag + '>'));
        result.push('</tr>');
        if (!headerDone) {
          result.push('</thead>');
          result.push('<tbody>');
          headerDone = true;
        }
      } else {
        closeTable();
        result.push(raw);
      }
    }
    closeTable();
    return result.join('\n');
  }

  function processList(input: string, pattern: RegExp, tag: string): string {
    const lines = input.split('\n');
    const result: string[] = [];
    let inList = false;
    for (const line of lines) {
      const m = line.match(pattern);
      if (m) {
        if (!inList) {
          result.push('<' + tag + '>');
          inList = true;
        }
        result.push('<li>' + m[1] + '</li>');
      } else {
        if (inList) {
          result.push('</' + tag + '>');
          inList = false;
        }
        result.push(line);
      }
    }
    if (inList) {
      result.push('</' + tag + '>');
    }
    return result.join('\n');
  }

  function wrapParagraphs(input: string): string {
    const blockTags = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'pre',
      'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div',
    ];
    const open = new RegExp('^<(' + blockTags.join('|') + ')[\\s>]', 'i');
    const close = new RegExp('^</(' + blockTags.join('|') + ')>', 'i');

    const lines = input.split('\n');
    const result: string[] = [];
    let para: string[] = [];

    const flush = () => {
      if (para.length > 0) {
        const content = para.join(' ').trim();
        if (content) {
          result.push('<p>' + content + '</p>');
        }
        para = [];
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        flush();
        continue;
      }
      if (open.test(trimmed) || close.test(trimmed)) {
        flush();
        result.push(line);
      } else {
        para.push(trimmed);
      }
    }
    flush();
    return result.join('\n');
  }
}

/**
 * Bionic-bold a single run of plain text (whitespace preserved). Pure and
 * self-contained; the webview's DOM walker calls this per text node.
 *
 * text-vide formula: boldLength = max(1, min(floor(len * fixationPoint / 6), len)).
 */
export function applyBionicText(text: string, fixationPoint: number): string {
  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  return text
    .split(/(\s+)/)
    .map((word) => {
      if (!word.trim()) {
        return word;
      }
      const length = word.length;
      const boldLength =
        length <= 1
          ? 1
          : Math.max(1, Math.min(Math.floor((length * fixationPoint) / 6), length));
      const boldPart = escapeHtml(word.slice(0, boldLength));
      const dimPart = escapeHtml(word.slice(boldLength));
      if (dimPart) {
        return '<b>' + boldPart + '</b><span class="bionic-dim">' + dimPart + '</span>';
      }
      return '<b>' + boldPart + '</b>';
    })
    .join('');
}
