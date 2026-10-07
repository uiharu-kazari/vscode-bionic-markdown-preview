import { describe, it, expect } from 'vitest';
import { preprocessMath } from './mathPreprocessor';

describe('preprocessMath', () => {
  it('renders inline $...$ math and leaves a placeholder id', () => {
    const { processed, mathRendered } = preprocessMath('value $x + 1$ here');
    expect(mathRendered).toHaveLength(1);
    expect(mathRendered[0].display).toBe(false);
    expect(mathRendered[0].html).toContain('katex');
    expect(processed).toContain(mathRendered[0].id);
    expect(processed).not.toContain('$');
  });

  it('renders display $$...$$ math in display mode', () => {
    const { mathRendered } = preprocessMath('$$\\int_0^1 x\\,dx$$');
    expect(mathRendered).toHaveLength(1);
    expect(mathRendered[0].display).toBe(true);
  });

  it('handles \\[...\\], \\(...\\) and \\begin/\\end environments', () => {
    expect(preprocessMath('\\[a^2\\]').mathRendered[0].display).toBe(true);
    expect(preprocessMath('x \\(b\\) y').mathRendered[0].display).toBe(false);
    expect(preprocessMath('\\begin{matrix}a\\end{matrix}').mathRendered[0].display).toBe(true);
  });

  it('does not treat bare dollar amounts as math', () => {
    const { mathRendered, processed } = preprocessMath('costs $5 and $10');
    expect(mathRendered).toHaveLength(0);
    expect(processed).toBe('costs $5 and $10');
  });

  it('protects code fences and inline code from math extraction', () => {
    const fenced = preprocessMath('```\n$x$\n```');
    expect(fenced.mathRendered).toHaveLength(0);
    expect(fenced.processed).toContain('$x$');

    const inline = preprocessMath('`$y$`');
    expect(inline.mathRendered).toHaveLength(0);
    expect(inline.processed).toContain('`$y$`');
  });

  it('falls back to <code> for invalid LaTeX instead of throwing', () => {
    const { mathRendered } = preprocessMath('$\\frac{1}{$');
    expect(mathRendered).toHaveLength(1);
    // throwOnError:false → still produces something renderable
    expect(typeof mathRendered[0].html).toBe('string');
    expect(mathRendered[0].html.length).toBeGreaterThan(0);
  });

  it('assigns sequential, unique placeholder ids', () => {
    const { mathRendered } = preprocessMath('$a$ and $$b$$ and \\(c\\)');
    const ids = mathRendered.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('MATHBLOCK0ENDMATH');
  });

  it('leaves plain text unchanged', () => {
    const { processed, mathRendered } = preprocessMath('no math here');
    expect(processed).toBe('no math here');
    expect(mathRendered).toHaveLength(0);
  });
});


describe('untrusted math', () => {
  it('blocks HTML and external-resource commands', () => {
    for (const math of ['\\href{javascript:alert(1)}{x}', '\\includegraphics{https://example.com/x.png}', '\\htmlClass{attack}{x}']) {
      const result = preprocessMath('$' + math + '$').mathRendered[0].html;
      expect(result).not.toContain('<a ');
      expect(result).not.toContain('<img');
      expect(result).not.toContain('class="attack"');
    }
  });
  it('provides MathML for assistive technology', () => {
    expect(preprocessMath('$x^2$').mathRendered[0].html).toContain('<math');
  });
  it('does not collide with a literal placeholder already in the document', () => {
    const result = preprocessMath('MATHBLOCK0ENDMATH and $x$');
    expect(result.mathRendered[0].id).not.toBe('MATHBLOCK0ENDMATH');
    expect(result.processed).toContain('MATHBLOCK0ENDMATH and ');
  });
});


describe('Markdown code boundaries', () => {
  it.each(['````\n$x$\n```\n$x$\n````', '~~~\n$x$\n~~~', '```\n$x$', '    $x$\n', '``a `$x$` b``'])('leaves math inside code unchanged: %s', markdown => {
    const result = preprocessMath(markdown);
    expect(result.processed).toBe(markdown);
    expect(result.mathRendered).toHaveLength(0);
  });
});
