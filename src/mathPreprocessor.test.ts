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
