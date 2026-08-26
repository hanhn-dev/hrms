import { describe, expect, it } from 'vitest';
import { buildDraftSpecFromWorkItemPrompt } from '../../prompts/draft-spec-from-work-item.js';

describe('buildDraftSpecFromWorkItemPrompt', () => {
  it('injects the work item id into the recipe (positive)', () => {
    const text = buildDraftSpecFromWorkItemPrompt('145736');
    expect(text).toContain('az_get_work_item_spec_context with id=145736');
    expect(text).toContain('Happy / Rainy / Edge');
  });

  it('does not leave unsubstituted placeholders (negative)', () => {
    expect(buildDraftSpecFromWorkItemPrompt('99')).not.toContain('{id}');
  });

  it('keeps the empty-AC ask instruction (edge)', () => {
    expect(buildDraftSpecFromWorkItemPrompt('1')).toContain('ASK the user');
  });
});
