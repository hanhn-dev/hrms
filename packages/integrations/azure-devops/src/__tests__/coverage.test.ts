import { describe, expect, it } from 'vitest';
import {
  acceptanceCriteriaLooksBuriedInDescription,
  buildWorkItemCoverage,
  htmlFieldHasContent,
  isAcceptanceCriteriaEmpty,
  isDescriptionThin,
  stripBoilerplate,
} from '../coverage.js';

describe('stripBoilerplate', () => {
  it('collapses whitespace and nbsp entities (positive)', () => {
    expect(stripBoilerplate('  Hello&nbsp;world  ')).toBe('Hello world');
  });

  it('returns empty string for whitespace-only input (negative)', () => {
    expect(stripBoilerplate('   \n\t  ')).toBe('');
  });

  it('treats unicode nbsp as space (edge)', () => {
    expect(stripBoilerplate(`\u00a0TBD\u00a0`)).toBe('TBD');
  });
});

describe('htmlFieldHasContent', () => {
  it('returns true for HTML with visible text (positive)', () => {
    expect(htmlFieldHasContent('<p>Ship login toast</p>')).toBe(true);
  });

  it('returns false for empty or tag-only HTML (negative)', () => {
    expect(htmlFieldHasContent(null)).toBe(false);
    expect(htmlFieldHasContent(undefined)).toBe(false);
    expect(htmlFieldHasContent('')).toBe(false);
    expect(htmlFieldHasContent('<p></p>')).toBe(false);
  });

  it('returns false for nbsp-only markup (edge)', () => {
    expect(htmlFieldHasContent('<div>&nbsp;</div>')).toBe(false);
  });
});

describe('isAcceptanceCriteriaEmpty', () => {
  it('returns false when AC has list text (positive)', () => {
    expect(isAcceptanceCriteriaEmpty('- User can save')).toBe(false);
  });

  it('returns true for empty or whitespace AC (negative)', () => {
    expect(isAcceptanceCriteriaEmpty('')).toBe(true);
    expect(isAcceptanceCriteriaEmpty('   ')).toBe(true);
  });

  it('returns true for nbsp-only AC (edge)', () => {
    expect(isAcceptanceCriteriaEmpty('&nbsp;')).toBe(true);
  });
});

describe('acceptanceCriteriaLooksBuriedInDescription', () => {
  it('detects an Acceptance Criteria heading (positive)', () => {
    expect(acceptanceCriteriaLooksBuriedInDescription('## Acceptance Criteria\n- done')).toBe(true);
  });

  it('returns false for a plain narrative (negative)', () => {
    expect(acceptanceCriteriaLooksBuriedInDescription('Migrate the username-changed email.')).toBe(false);
  });

  it('detects Given/When/Then and AC-n prefixes (edge)', () => {
    expect(
      acceptanceCriteriaLooksBuriedInDescription('Given a user When they save Then a toast appears'),
    ).toBe(true);
    expect(acceptanceCriteriaLooksBuriedInDescription('AC-1: email is sent')).toBe(true);
  });
});

describe('isDescriptionThin', () => {
  it('returns false for a substantial description (positive)', () => {
    expect(
      isDescriptionThin('Migrate live PersonalInformation.aspx username email into React My Details.'),
    ).toBe(false);
  });

  it('returns true for empty, TBD, TODO, and N/A placeholders (negative)', () => {
    expect(isDescriptionThin('')).toBe(true);
    expect(isDescriptionThin('TBD')).toBe(true);
    expect(isDescriptionThin('todo.')).toBe(true);
    expect(isDescriptionThin('n/a')).toBe(true);
  });

  it('returns true when stripped length is under 40 characters (edge)', () => {
    expect(isDescriptionThin('Short note')).toBe(true);
    expect(isDescriptionThin('&nbsp;See wiki&nbsp;')).toBe(true);
  });
});

describe('buildWorkItemCoverage', () => {
  it('counts attachments, children, and related items (positive)', () => {
    const coverage = buildWorkItemCoverage({
      description: 'Migrate live PersonalInformation.aspx username email into React My Details.',
      acceptanceCriteria: '- Send username email when work email changes',
      childIds: [1, 2],
      relatedWorkItemIds: [9],
      attachments: [{ isImage: true }, { isImage: false }, { isImage: true }],
      acItemCount: 3,
    });

    expect(coverage).toEqual({
      acceptanceCriteriaEmpty: false,
      acceptanceCriteriaLooksBuriedInDescription: false,
      descriptionThin: false,
      childCount: 2,
      relatedCount: 1,
      imageCount: 2,
      nonImageAttachmentCount: 1,
      acItemCount: 3,
    });
  });

  it('flags empty AC and thin description (negative)', () => {
    const coverage = buildWorkItemCoverage({
      description: 'TBD',
      acceptanceCriteria: '',
      childIds: [],
      relatedWorkItemIds: [],
      attachments: [],
    });

    expect(coverage.acceptanceCriteriaEmpty).toBe(true);
    expect(coverage.descriptionThin).toBe(true);
    expect(coverage.acItemCount).toBe(0);
  });

  it('flags AC buried in description and PDF vs PNG counts (edge)', () => {
    const coverage = buildWorkItemCoverage({
      description: 'Acceptance Criteria\n- given when then',
      acceptanceCriteria: '',
      childIds: [],
      relatedWorkItemIds: [],
      attachments: [{ isImage: false }, { isImage: true }],
    });

    expect(coverage.acceptanceCriteriaLooksBuriedInDescription).toBe(true);
    expect(coverage.imageCount).toBe(1);
    expect(coverage.nonImageAttachmentCount).toBe(1);
  });
});
