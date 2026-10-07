import MarkdownIt from 'markdown-it';
import type { MathRendered } from './mathPreprocessor';

/** Parse Markdown in the extension host. Raw HTML and unsafe URL schemes stay disabled. */
export function parseMarkdown(md: string, mathRendered: MathRendered[] = [], imageSource?: (src: string) => string): string {
  if (!md) return '';
  const parser = new MarkdownIt({ html: false, linkify: false, typographer: false });
  const validateLink = parser.validateLink.bind(parser);
  parser.validateLink = url => validateLink(url) && (!/^[a-z][a-z\d+.-]*:/i.test(url) || /^(https?:|mailto:)/i.test(url));
  const math = new Map(mathRendered.map(item => [item.id, item]));
  // Math is an explicit token, never a replacement inside an HTML attribute or code fence.
  parser.inline.ruler.before('text', 'bionic_math', (state, silent) => {
    for (const [id, item] of math) {
      if (!state.src.startsWith(id, state.pos)) continue;
      if (!silent) {
        const token = state.push('bionic_math', '', 0);
        token.content = item.html;
        token.meta = item.display;
      }
      state.pos += id.length;
      return true;
    }
    return false;
  });
  // The text rule can consume an id in the middle of a sentence. Split only text tokens,
  // after parsing, so code, image attributes and link destinations remain protected.
  parser.core.ruler.after('inline', 'bionic_math_text', state => {
    for (const block of state.tokens) {
      if (!block.children) continue;
      const children = [];
      for (const token of block.children) {
        if (token.type !== 'text') { children.push(token); continue; }
        let remaining = token.content;
        while (remaining) {
          const found = [...math.values()].map(item => ({item, index: remaining.indexOf(item.id)}))
            .filter(hit => hit.index >= 0).sort((a, b) => a.index - b.index)[0];
          if (!found) {
            const text = new state.Token('text', '', 0); text.content = remaining; children.push(text); break;
          }
          if (found.index) { const text = new state.Token('text', '', 0); text.content = remaining.slice(0, found.index); children.push(text); }
          const formula = new state.Token('bionic_math', '', 0); formula.content = found.item.html; formula.meta = found.item.display; children.push(formula);
          remaining = remaining.slice(found.index + found.item.id.length);
        }
      }
      block.children = children;
    }
  });
  parser.renderer.rules.bionic_math = (tokens, index) => {
    const token = tokens[index];
    // A span is valid within paragraphs, headings, and table cells; display styling provides layout.
    return '<span class="' + (token.meta ? 'math-display' : 'math-inline') + '">' + token.content + '</span>';
  };
  if (imageSource) {
    const defaultImage = parser.renderer.rules.image!;
    parser.renderer.rules.image = (tokens, index, options, env, self) => {
      const token = tokens[index];
      const src = imageSource(token.attrGet('src') || '');
      if (!src) return '<span class="image-placeholder">' + parser.utils.escapeHtml(token.content || 'Image') + ' (image not loaded)</span>';
      token.attrSet('src', src);
      return defaultImage(tokens, index, options, env, self);
    };
  }
  return parser.render(md).trim();
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
