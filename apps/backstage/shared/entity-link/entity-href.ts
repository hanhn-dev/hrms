export type EntityRef =
  | { kind: "employee"; employmentNumber: string }
  | { kind: "employeeSection"; employmentNumber: string; sectionId: number }
  | { kind: "fieldSection"; section: string }
  | { kind: "field"; section: string; fieldName: string }
  | { kind: "workflow"; workflowId: number }
  | { kind: "workflowPage"; pageName: string }
  | { kind: "workflowGroup"; roleId: number }
  | { kind: "role"; roleId: number }
  | { kind: "upload"; uploadId: number }
  | { kind: "changeRequest"; changeRequestId: number };

function text(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

function positiveId(value: number): number | null {
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function entityHref(employerId: number, ref: EntityRef): string | null {
  const base = `/employers/${employerId}`;
  switch (ref.kind) {
    case "employee": {
      const employmentNumber = text(ref.employmentNumber);
      if (!employmentNumber) {
        return null;
      }
      return `${base}/employees/${encodeURIComponent(employmentNumber)}`;
    }
    case "employeeSection": {
      const employmentNumber = text(ref.employmentNumber);
      const sectionId = positiveId(ref.sectionId);
      if (!employmentNumber || sectionId == null) {
        return null;
      }
      return `${base}/employees/${encodeURIComponent(employmentNumber)}/sections/${sectionId}`;
    }
    case "fieldSection": {
      const section = text(ref.section);
      if (!section) {
        return null;
      }
      return `${base}/fields?${new URLSearchParams({ section })}`;
    }
    case "field": {
      const section = text(ref.section);
      const field = text(ref.fieldName);
      if (!section || !field) {
        return null;
      }
      return `${base}/fields?${new URLSearchParams({ section, field })}`;
    }
    case "workflow": {
      const workflowId = positiveId(ref.workflowId);
      if (workflowId == null) {
        return null;
      }
      return `${base}/workflows/${workflowId}`;
    }
    case "workflowPage": {
      const page = text(ref.pageName);
      if (!page) {
        return null;
      }
      return `${base}/workflows?${new URLSearchParams({ tab: "pages", page })}`;
    }
    case "workflowGroup": {
      const roleId = positiveId(ref.roleId);
      if (roleId == null) {
        return null;
      }
      return `${base}/workflows?${new URLSearchParams({ tab: "groups", group: String(roleId) })}`;
    }
    case "role": {
      const roleId = positiveId(ref.roleId);
      if (roleId == null) {
        return null;
      }
      return `${base}/roles?${new URLSearchParams({ roleId: String(roleId) })}`;
    }
    case "upload": {
      const uploadId = positiveId(ref.uploadId);
      if (uploadId == null) {
        return null;
      }
      return `${base}/uploads/${uploadId}`;
    }
    case "changeRequest": {
      const changeRequestId = positiveId(ref.changeRequestId);
      if (changeRequestId == null) {
        return null;
      }
      return `${base}/workflows?${new URLSearchParams({
        tab: "requests",
        request: String(changeRequestId),
      })}`;
    }
  }
}
