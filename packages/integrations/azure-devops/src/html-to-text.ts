import TurndownService from 'turndown';
import type { WorkItemInlineImage } from './types.js';

const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });

td.addRule('gfmTable', {
  filter: 'table',
  replacement(_content, node) {
    const markdown = tableToMarkdown(node as TurndownNode);
    return markdown.length > 0 ? `\n\n${markdown}\n\n` : '';
  },
});

td.addRule('keepOrderedList', {
  filter: 'ol',
  replacement(content) {
    const items = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/^(?:\d+\.\s+|-\s+)/, ''));

    if (items.length === 0) {
      return '\n';
    }

    return `\n\n${items.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\n`;
  },
});

td.addRule('strikethrough', {
  filter(node) {
    const name = node.nodeName;
    return name === 'DEL' || name === 'S' || name === 'STRIKE';
  },
  replacement(content) {
    return `~~${content}~~`;
  },
});

export function htmlToMarkdown(html: string | null | undefined): string {
  if (html === null || html === undefined || html === '') {
    return '';
  }

  const normalised = html.replace(/&nbsp;/gi, ' ').replace(/\u00a0/g, ' ');
  return td.turndown(normalised).trim();
}

export function extractInlineImages(html: string | null | undefined): WorkItemInlineImage[] {
  if (html === null || html === undefined || html === '') {
    return [];
  }

  const images: WorkItemInlineImage[] = [];
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const src = getHtmlAttribute(tag, 'src');
    if (src === null) {
      continue;
    }

    images.push({
      alt: getHtmlAttribute(tag, 'alt') ?? '',
      src,
    });
  }

  return images;
}

function getHtmlAttribute(tag: string, name: string): string | null {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = tag.match(pattern);
  const value = match?.[1] ?? match?.[2] ?? match?.[3];
  if (value === undefined || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

type TurndownNode = {
  readonly nodeName?: string;
  readonly childNodes?: ArrayLike<TurndownNode>;
  readonly textContent?: string | null;
};

function elementChildren(node: TurndownNode, nodeName: string): TurndownNode[] {
  return Array.from(node.childNodes ?? []).filter((child) => child.nodeName === nodeName);
}

function tableToMarkdown(table: TurndownNode): string {
  const rows = collectTableRows(table);
  if (rows.length === 0) {
    return '';
  }

  const columnCount = Math.max(...rows.map((row) => row.length), 0);
  if (columnCount === 0) {
    return '';
  }

  const padded = rows.map((row) => {
    const cells = row.map((cell) => cell.replace(/\|/g, '\\|').trim());
    while (cells.length < columnCount) {
      cells.push('');
    }
    return cells;
  });

  const header = padded[0] ?? Array.from({ length: columnCount }, () => '');
  const body = padded.slice(1);
  const separator = header.map(() => '---');

  return [
    `| ${header.join(' | ')} |`,
    `| ${separator.join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function collectTableRows(table: TurndownNode): string[][] {
  const sections = ['THEAD', 'TBODY', 'TFOOT'];
  const rowNodes: TurndownNode[] = [];

  for (const sectionName of sections) {
    for (const section of elementChildren(table, sectionName)) {
      rowNodes.push(...elementChildren(section, 'TR'));
    }
  }

  rowNodes.push(...elementChildren(table, 'TR'));

  return rowNodes.map((row) =>
    Array.from(row.childNodes ?? [])
      .filter((cell) => cell.nodeName === 'TH' || cell.nodeName === 'TD')
      .map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim()),
  );
}
