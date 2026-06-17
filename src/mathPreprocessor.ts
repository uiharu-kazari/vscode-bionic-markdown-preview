import katex from 'katex';

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
 * tested directly. Kept byte-for-byte equivalent to the original inline logic.
 */
export function preprocessMath(markdown: string): PreprocessResult {
  const mathRendered: MathRendered[] = [];
  let processed = markdown;

  // Protect code blocks and inline code from math extraction
  const codeProtections: Array<{ placeholder: string; original: string }> = [];

  processed = processed.replace(/(?:```|~~~)[\s\S]*?(?:```|~~~)/g, (match) => {
    const placeholder = `\x00CODE${codeProtections.length}\x00`;
    codeProtections.push({ placeholder, original: match });
    return placeholder;
  });

  processed = processed.replace(/`[^`]+`/g, (match) => {
    const placeholder = `\x00CODE${codeProtections.length}\x00`;
    codeProtections.push({ placeholder, original: match });
    return placeholder;
  });

  const renderMath = (math: string, display: boolean): string => {
    const id = `MATHBLOCK${mathRendered.length}ENDMATH`;
    try {
      const html = katex.renderToString(math.trim(), {
        displayMode: display,
        throwOnError: false,
        output: 'html',
        trust: true,
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
      mathRendered.push({ id, html: `<code>${math.trim()}</code>`, display });
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
