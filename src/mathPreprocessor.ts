import katex from 'katex';
import MarkdownIt from 'markdown-it';

export interface MathRendered {
  id: string;
  html: string;
  display: boolean;
}

export interface PreprocessResult {
  processed: string;
  mathRendered: MathRendered[];
}

/**
 * Extract math expressions from markdown, render them with KaTeX, and replace
 * each with a plain-text placeholder id. The webview re-injects the rendered
 * HTML at those ids after its (DOM-free) markdown parse.
 *
 * Pure except for KaTeX rendering — no `vscode` dependency — so it can be unit
 * tested directly. Math commands cannot access HTML classes, links, or images.
 */
export function preprocessMath(markdown: string): PreprocessResult {
  const mathRendered: MathRendered[] = [];
  let processed = markdown;
  // IDs cannot collide with literal content supplied by the document.
  let prefix = 'MATHBLOCK';
  while (markdown.includes(prefix)) prefix = 'X' + prefix;
  const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Protect code blocks and inline code from math extraction
  const codeProtections: Array<{ placeholder: string; original: string }> = [];

  // Use Markdown's own block maps so unclosed, longer, nested, and indented
  // code blocks have exactly the same boundaries as the document parser.
  const lines = markdown.split('\n');
  const offsets = [0];
  for (const line of lines) offsets.push(offsets[offsets.length - 1] + line.length + 1);
  const blocks = new MarkdownIt({ html: false }).parse(markdown, {})
    .filter(token => (token.type === 'fence' || token.type === 'code_block') && token.map)
    .sort((a, b) => b.map![0] - a.map![0]);
  for (const block of blocks) {
    const [first, last] = block.map!;
    const start = offsets[first];
    const end = Math.min(offsets[last], markdown.length);
    const original = processed.slice(start, end);
    const placeholder = `\x00CODE${codeProtections.length}\x00`;
    codeProtections.push({ placeholder, original });
    processed = processed.slice(0, start) + placeholder + processed.slice(end);
  }

  // Inline code can use matching runs of any number of backticks.
  processed = processed.replace(/(`+)([\s\S]*?)\1(?!`)/g, match => {
    const placeholder = `\x00CODE${codeProtections.length}\x00`;
    codeProtections.push({ placeholder, original: match });
    return placeholder;
  });

  const renderMath = (math: string, display: boolean): string => {
    const id = `${prefix}${mathRendered.length}ENDMATH`;
    try {
      const html = katex.renderToString(math.trim(), {
        displayMode: display,
        throwOnError: false,
        output: 'htmlAndMathml',
        maxExpand: 1000,
        maxSize: 20,
        trust: false,
        strict: false,
        macros: {
          '\\R': '\\mathbb{R}',
          '\\N': '\\mathbb{N}',
          '\\Z': '\\mathbb{Z}',
          '\\Q': '\\mathbb{Q}',
          '\\C': '\\mathbb{C}',
        },
      });
      mathRendered.push({ id, html, display });
    } catch {
      mathRendered.push({ id, html: `<code>${escapeHtml(math.trim())}</code>`, display });
    }
    return id;
  };

  // Display math: \[...\]
  processed = processed.replace(/\\\[([\s\S]+?)\\\]/g, (_, math) => renderMath(math, true));

  // Display math: \begin{...}...\end{...}
  processed = processed.replace(/\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g, (match) => {
    return renderMath(match, true);
  });

  // Display math: $$...$$
  processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => renderMath(math, true));

  // Inline math: \(...\)
  processed = processed.replace(/\\\(([\s\S]+?)\\\)/g, (_, math) => renderMath(math, false));

  // Inline math: $...$ (must contain a letter or backslash)
  processed = processed.replace(/(?<![\\$])\$(?!\s)([^$\n]*[a-zA-Z\\][^$\n]*?)(?<!\s)\$(?!\$)/g, (_, math) => renderMath(math, false));

  // Restore code blocks (use function replacement to avoid $ special patterns)
  for (const { placeholder, original } of codeProtections) {
    processed = processed.replace(placeholder, () => original);
  }

  return { processed, mathRendered };
}
