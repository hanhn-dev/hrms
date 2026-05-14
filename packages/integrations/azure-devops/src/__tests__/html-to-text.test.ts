import { describe, expect, it } from 'vitest';
import { htmlToMarkdown } from '../html-to-text.js';

describe('htmlToMarkdown', () => {
  it('converts <p> HTML to plain text paragraph', () => {
    expect(htmlToMarkdown('<p>Hello world</p>')).toBe('Hello world');
  });

  it('converts <ul><li> to Markdown list with - bullets', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    const result = htmlToMarkdown(html);
    expect(result).toMatch(/^- +Item 1$/m);
    expect(result).toMatch(/^- +Item 2$/m);
  });

  it('converts <h1> to # heading', () => {
    expect(htmlToMarkdown('<h1>Title</h1>')).toBe('# Title');
  });

  it('returns empty string for null', () => {
    expect(htmlToMarkdown(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(htmlToMarkdown(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(htmlToMarkdown('')).toBe('');
  });

  it('returns plain text unchanged', () => {
    expect(htmlToMarkdown('plain text')).toBe('plain text');
  });
});
