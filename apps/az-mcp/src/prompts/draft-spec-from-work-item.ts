export const DRAFT_SPEC_FROM_WORK_ITEM_PROMPT = `You are drafting a feature spec from Azure DevOps work item {id}.

Do not invent requirements or acceptance criteria. Do not treat ADO acceptance criteria as ground truth versus live code.

Steps:
1. Call az_get_work_item_spec_context with id={id}.
2. For each image attachment (isImage true), call az_get_work_item_image so you can see mockups.
3. If hints mention az_get_work_item_revisions, call it to see how Description/AC evolved.
4. Summarize the requirement: goal, actors, in-scope, out-of-scope. Cite work-item IDs.
5. Emit acceptance criteria grouped as Happy / Rainy / Edge. Each row needs an observable check and a source tag: [ADO], [Comment], or [Derived].
6. If coverage.acceptanceCriteriaEmpty is true, or most acceptanceCriteriaItems have observable=false, ASK the user — do not invent AC.
7. If ADO wording contradicts comments, flag the discrepancy instead of merging them silently.
8. Do not write generated AC back to Azure DevOps.`;

export function buildDraftSpecFromWorkItemPrompt(id: string): string {
  return DRAFT_SPEC_FROM_WORK_ITEM_PROMPT.replaceAll('{id}', id);
}
