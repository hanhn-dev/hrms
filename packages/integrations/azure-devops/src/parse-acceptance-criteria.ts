import type { AcceptanceCriteriaItem } from './types.js';
import { acceptanceCriteriaLooksBuriedInDescription, stripBoilerplate } from './coverage.js';

const UNTESTABLE_PATTERN =
  /exactly as (today|configured)|as per workflow|should work|no visible change|functionally identical/i;
const LIST_ITEM_PATTERN = /^(?:[-*+]|\d+\.)\s+(.+)$/;
const TABLE_SEPARATOR_PATTERN = /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/;
const AC_HEADING_PATTERN = /^(?:#{1,6}\s*)?ac[- ]?(\d+)\s*[:.)-]?\s*(.*)$/i;

export function isObservableAcceptanceCriterion(text: string): boolean {
  return !UNTESTABLE_PATTERN.test(text);
}

export function parseAcceptanceCriteria(input: {
  readonly acceptanceCriteria: string;
  readonly description: string;
}): AcceptanceCriteriaItem[] {
  const fromField = splitCriteria(input.acceptanceCriteria);
  if (fromField.length > 0) {
    return toItems(fromField, 'field');
  }

  if (!acceptanceCriteriaLooksBuriedInDescription(input.description)) {
    return [];
  }

  return toItems(splitCriteria(input.description), 'description');
}

function toItems(texts: readonly string[], source: AcceptanceCriteriaItem['source']): AcceptanceCriteriaItem[] {
  return texts.map((text, index) => ({
    id: `AC-${index + 1}`,
    text,
    source,
    observable: isObservableAcceptanceCriterion(text),
  }));
}

function splitCriteria(markdown: string): string[] {
  const trimmed = markdown.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const headingItems = splitByAcHeadings(trimmed);
  if (headingItems.length > 1 || (headingItems.length === 1 && AC_HEADING_PATTERN.test(trimmed.split(/\r?\n/)[0] ?? ''))) {
    return headingItems;
  }

  const listItems = splitMarkdownList(trimmed);
  if (listItems.length > 0) {
    return listItems;
  }

  const tableItems = splitGfmTableRows(trimmed);
  if (tableItems.length > 0) {
    return tableItems;
  }

  const single = stripBoilerplate(trimmed);
  return single.length > 0 ? [single] : [];
}

function splitByAcHeadings(markdown: string): string[] {
  const items: string[] = [];
  let current: string[] = [];

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.trim().match(AC_HEADING_PATTERN);
    if (heading) {
      if (current.length > 0) {
        items.push(stripBoilerplate(current.join(' ')));
      }
      const rest = heading[2]?.trim() ?? '';
      current = rest.length > 0 ? [rest] : [];
      continue;
    }

    if (current.length > 0) {
      current.push(line.trim());
    }
  }

  if (current.length > 0) {
    items.push(stripBoilerplate(current.join(' ')));
  }

  return items.filter((item) => item.length > 0);
}

function splitMarkdownList(markdown: string): string[] {
  const items: string[] = [];
  let current: string | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    const match = line.trim().match(LIST_ITEM_PATTERN);
    if (match?.[1]) {
      if (current !== null) {
        items.push(stripBoilerplate(current));
      }
      current = match[1];
      continue;
    }

    if (current !== null && line.trim().length > 0) {
      current = `${current} ${line.trim()}`;
    }
  }

  if (current !== null) {
    items.push(stripBoilerplate(current));
  }

  return items.filter((item) => item.length > 0);
}

function splitGfmTableRows(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.includes('|'));
  if (lines.length < 2) {
    return [];
  }

  const dataLines = lines.filter((line, index) => index > 0 && !TABLE_SEPARATOR_PATTERN.test(line));
  return dataLines
    .map((line) => {
      const cells = line
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0);
      return stripBoilerplate(cells.join(' — '));
    })
    .filter((item) => item.length > 0);
}
