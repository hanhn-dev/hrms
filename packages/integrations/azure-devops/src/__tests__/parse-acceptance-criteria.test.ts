import { describe, expect, it } from 'vitest';
import { isObservableAcceptanceCriterion, parseAcceptanceCriteria } from '../parse-acceptance-criteria.js';

describe('parseAcceptanceCriteria', () => {
  it('splits markdown list items from the AC field (positive)', () => {
    expect(
      parseAcceptanceCriteria({
        acceptanceCriteria: '- User can save\n- Toast appears',
        description: 'A feature that is described in enough detail not to be thin.',
      }),
    ).toEqual([
      { id: 'AC-1', text: 'User can save', source: 'field', observable: true },
      { id: 'AC-2', text: 'Toast appears', source: 'field', observable: true },
    ]);
  });

  it('returns an empty list when both fields are empty (negative)', () => {
    expect(parseAcceptanceCriteria({ acceptanceCriteria: '', description: '' })).toEqual([]);
  });

  it('parses GFM table data rows, AC headings, and buried description lists (edge)', () => {
    expect(
      parseAcceptanceCriteria({
        acceptanceCriteria: '| Given | Then |\n| --- | --- |\n| Save | Toast |',
        description: '',
      }),
    ).toEqual([{ id: 'AC-1', text: 'Save — Toast', source: 'field', observable: true }]);

    expect(
      parseAcceptanceCriteria({
        acceptanceCriteria: 'AC-1: email is sent\nAC-2: toast is shown',
        description: '',
      }),
    ).toEqual([
      { id: 'AC-1', text: 'email is sent', source: 'field', observable: true },
      { id: 'AC-2', text: 'toast is shown', source: 'field', observable: true },
    ]);

    expect(
      parseAcceptanceCriteria({
        acceptanceCriteria: '',
        description: 'Acceptance Criteria\n- given when then\n- second item',
      }),
    ).toEqual([
      { id: 'AC-1', text: 'given when then', source: 'description', observable: true },
      { id: 'AC-2', text: 'second item', source: 'description', observable: true },
    ]);
  });
});

describe('isObservableAcceptanceCriterion', () => {
  it('returns true for a concrete check (positive)', () => {
    expect(isObservableAcceptanceCriterion('Employee receives the username-changed email')).toBe(true);
  });

  it('returns false for vague ADO wording (negative)', () => {
    expect(isObservableAcceptanceCriterion('Emails fire exactly as configured in Workflow')).toBe(false);
    expect(isObservableAcceptanceCriterion('as per workflow the email is sent')).toBe(false);
    expect(isObservableAcceptanceCriterion('should work after migration')).toBe(false);
    expect(isObservableAcceptanceCriterion('no visible change to users')).toBe(false);
    expect(isObservableAcceptanceCriterion('functionally identical to .NET')).toBe(false);
  });

  it('treats unknown wording as observable (edge)', () => {
    expect(isObservableAcceptanceCriterion('')).toBe(true);
  });
});
