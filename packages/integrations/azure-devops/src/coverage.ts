import type { WorkItemAttachment, WorkItemCoverage } from './types.js';

const BURIED_AC_PATTERN = /acceptance\s*criteria|given\s+[\s\S]*when\s+[\s\S]*then|^\s*ac[- ]?\d+/im;
const THIN_PLACEHOLDER_PATTERN = /^(tbd|todo|n\/?a)\.?$/i;
const THIN_DESCRIPTION_MAX_LENGTH = 40;

export function stripBoilerplate(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function htmlFieldHasContent(html: string | null | undefined): boolean {
  if (html === null || html === undefined || html === '') {
    return false;
  }

  const withoutTags = html.replace(/<[^>]*>/g, ' ');
  return stripBoilerplate(withoutTags).length > 0;
}

export function isAcceptanceCriteriaEmpty(acceptanceCriteria: string): boolean {
  return stripBoilerplate(acceptanceCriteria).length === 0;
}

export function acceptanceCriteriaLooksBuriedInDescription(description: string): boolean {
  return BURIED_AC_PATTERN.test(description);
}

export function isDescriptionThin(description: string): boolean {
  const stripped = stripBoilerplate(description);
  if (stripped.length === 0) {
    return true;
  }
  if (THIN_PLACEHOLDER_PATTERN.test(stripped)) {
    return true;
  }
  return stripped.length < THIN_DESCRIPTION_MAX_LENGTH;
}

export function buildWorkItemCoverage(item: {
  readonly description: string;
  readonly acceptanceCriteria: string;
  readonly childIds: readonly number[];
  readonly relatedWorkItemIds: readonly number[];
  readonly attachments: readonly Pick<WorkItemAttachment, 'isImage'>[];
  readonly acItemCount?: number;
}): WorkItemCoverage {
  const imageCount = item.attachments.filter((attachment) => attachment.isImage).length;

  return {
    acceptanceCriteriaEmpty: isAcceptanceCriteriaEmpty(item.acceptanceCriteria),
    acceptanceCriteriaLooksBuriedInDescription: acceptanceCriteriaLooksBuriedInDescription(item.description),
    descriptionThin: isDescriptionThin(item.description),
    childCount: item.childIds.length,
    relatedCount: item.relatedWorkItemIds.length,
    imageCount,
    nonImageAttachmentCount: item.attachments.length - imageCount,
    acItemCount: item.acItemCount ?? 0,
  };
}
