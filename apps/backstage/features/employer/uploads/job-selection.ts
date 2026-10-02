import type { UploadErrorClass } from "@/features/employer/uploads/queries";

export type UploadSectionPick = {
  uploadSectionId: number;
  sectionId: number | null;
  invalid: number;
  unprocessed: number;
};

export function resolveUploadSelection<T extends UploadSectionPick>(input: {
  sections: T[];
  uploadSectionId: number | null;
  sectionId: number | null;
  errorClass: UploadErrorClass;
  invalid: number;
  unprocessed: number;
}): { section: T | null; errorClass: UploadErrorClass } {
  const section =
    input.sections.find((item) => item.uploadSectionId === input.uploadSectionId) ??
    input.sections.find((item) => item.sectionId === input.sectionId) ??
    input.sections.find((item) => item.invalid > 0 || item.unprocessed > 0) ??
    input.sections[0] ??
    null;
  const errorClass =
    input.errorClass === "validation" && input.invalid === 0 && input.unprocessed > 0
      ? "processing"
      : input.errorClass;
  return { section, errorClass };
}
