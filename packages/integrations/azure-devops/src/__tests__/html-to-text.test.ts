import { describe, expect, it } from 'vitest';
import { extractInlineImages, htmlToMarkdown } from '../html-to-text.js';

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

  it('converts HTML tables to GFM markdown (positive)', () => {
    const html =
      '<table><tr><th>Given</th><th>Then</th></tr><tr><td>Save</td><td>Toast</td></tr></table>';
    const result = htmlToMarkdown(html);
    expect(result).toContain('| Given | Then |');
    expect(result).toContain('| --- | --- |');
    expect(result).toContain('| Save | Toast |');
  });

  it('keeps ordered lists numbered instead of bullets (positive)', () => {
    const result = htmlToMarkdown('<ol><li>First</li><li>Second</li></ol>');
    expect(result).toMatch(/^1\. +First$/m);
    expect(result).toMatch(/^2\. +Second$/m);
    expect(result).not.toMatch(/^- +First$/m);
  });

  it('strips nbsp boilerplate (edge)', () => {
    expect(htmlToMarkdown('<p>Hello&nbsp;world</p>')).toBe('Hello world');
  });

  it('converts strikethrough tags to GFM (edge)', () => {
    expect(htmlToMarkdown('<p>Keep <del>old</del> copy</p>')).toBe('Keep ~~old~~ copy');
    expect(htmlToMarkdown('<p><s>gone</s> <strike>also</strike></p>')).toBe('~~gone~~ ~~also~~');
  });
});

describe('extractInlineImages', () => {
  it('extracts src and alt from img tags (positive)', () => {
    expect(
      extractInlineImages('<p>See <img src="https://cdn.example/a.png" alt="Flow"></p>'),
    ).toEqual([{ alt: 'Flow', src: 'https://cdn.example/a.png' }]);
  });

  it('returns empty for missing or empty html (negative)', () => {
    expect(extractInlineImages(null)).toEqual([]);
    expect(extractInlineImages('')).toEqual([]);
    expect(extractInlineImages('<p>No images</p>')).toEqual([]);
  });

  it('skips img tags without src and accepts single-quoted attributes (edge)', () => {
    expect(extractInlineImages('<img alt="x"><img src=\'https://cdn.example/b.png\'>')).toEqual([
      { alt: '', src: 'https://cdn.example/b.png' },
    ]);
  });
});
