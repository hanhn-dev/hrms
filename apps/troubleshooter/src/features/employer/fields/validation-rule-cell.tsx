"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  VALIDATION_RULE_MAX_LENGTH,
  validateValidationRuleValue,
} from "@hrms/db/validation-rule";
import {
  commitUpdateValidationRule,
  previewUpdateValidationRule,
} from "@/features/employer/fields/mutations";
import { ConfirmWriteModal, JsonEditorModal, JsonTextCell } from "@/shared/ui";

export function ValidationRuleCell({
  employerId,
  fieldId,
  fieldName,
  value,
  writesEnabled,
}: {
  employerId: number;
  fieldId: number;
  fieldName: string | null;
  value: string | null;
  writesEnabled: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const [editorOpen, setEditorOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const extraValidate = useCallback((parsed: unknown) => {
    const result = validateValidationRuleValue(parsed);
    return result.ok ? null : result.error;
  }, []);

  return (
    <>
      <JsonTextCell
        value={value}
        onClick={() => {
          setEditorOpen(true);
        }}
      />
      <JsonEditorModal
        disabledReason="Writes are disabled."
        extraValidate={extraValidate}
        maxCompactLength={VALIDATION_RULE_MAX_LENGTH}
        open={editorOpen}
        readOnly={!writesEnabled}
        title={fieldName ? `ValidationRule: ${fieldName}` : "ValidationRule"}
        value={value}
        onCancel={() => {
          setEditorOpen(false);
        }}
        onSave={(compact) => {
          setDraft(compact);
          setEditorOpen(false);
          setConfirmOpen(true);
        }}
      />
      <ConfirmWriteModal
        hideTrigger
        buttonLabel="Preview save"
        open={confirmOpen}
        previewAction={() =>
          previewUpdateValidationRule({
            employerId,
            fieldId,
            validationRule: draft,
          })
        }
        commitAction={commitUpdateValidationRule}
        successMessage="ValidationRule updated."
        title="Update ValidationRule"
        onDone={() => {
          router.refresh();
        }}
        onOpenChange={setConfirmOpen}
      />
    </>
  );
}

export function ValidationRuleViewCell({
  value,
  label,
}: {
  value: string | null;
  label?: string;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <JsonTextCell
        value={value}
        onClick={() => {
          setOpen(true);
        }}
      />
      <JsonEditorModal
        open={open}
        readOnly
        title={label ?? "ValidationRule"}
        value={value}
        onCancel={() => {
          setOpen(false);
        }}
        onSave={() => {
          setOpen(false);
        }}
      />
    </>
  );
}
