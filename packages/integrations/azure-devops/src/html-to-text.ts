import TurndownService from 'turndown';

const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });

export function htmlToMarkdown(html: string | null | undefined): string {
  if (html === null || html === undefined || html === '') return '';
  return td.turndown(html).trim();
}
