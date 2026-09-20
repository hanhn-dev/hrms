import type { FieldKind } from "@/shared/messaging";
import { generateValue } from "@/shared/generators";

/** Built-in fill personas for repeatable QA scenarios. */
export type PersonaId = "random-valid" | "invalid-contact";

export interface PersonaDefinition {
  id: PersonaId;
  name: string;
  description: string;
  /**
   * Force invalid generator values for these kinds (and matching labels).
   * Empty = always use valid generators unless a scenario overrides.
   */
  invalidKinds: readonly FieldKind[];
}

export const PERSONAS: readonly PersonaDefinition[] = [
  {
    id: "random-valid",
    name: "Random valid",
    description: "Label-aware valid random values (default).",
    invalidKinds: [],
  },
  {
    id: "invalid-contact",
    name: "Invalid email / phone",
    description:
      "Deliberately invalid email and phone values to exercise validation UI.",
    invalidKinds: ["email", "phone"],
  },
] as const;

export const DEFAULT_PERSONA_ID: PersonaId = "random-valid";

export function isPersonaId(value: unknown): value is PersonaId {
  return (
    typeof value === "string" && PERSONAS.some((persona) => persona.id === value)
  );
}

export function getPersona(id: PersonaId | undefined | null): PersonaDefinition {
  const match = PERSONAS.find((persona) => persona.id === id);
  return match ?? PERSONAS[0]!;
}

function normalizeLabel(label: string): string {
  return label.replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** True when the field should receive an invalid value for this persona. */
export function personaForcesInvalid(
  persona: PersonaDefinition,
  label: string,
  kind: FieldKind,
): boolean {
  if (persona.invalidKinds.length === 0) {
    return false;
  }
  if (persona.invalidKinds.includes(kind)) {
    return true;
  }
  const normalized = normalizeLabel(label);
  if (
    persona.invalidKinds.includes("email") &&
    normalized.includes("email")
  ) {
    return true;
  }
  if (
    persona.invalidKinds.includes("phone") &&
    /mobile|phone|tel/.test(normalized)
  ) {
    return true;
  }
  return false;
}

export interface PersonaGenerateOptions {
  label: string;
  kind: FieldKind;
  maxLength?: number | null;
  personaId?: PersonaId | null;
  /** Explicit invalid override (e.g. auto-type startWithInvalid). */
  invalid?: boolean;
}

/** Generate a value applying the active persona's invalid-kind rules. */
export function generateValueForPersona(
  options: PersonaGenerateOptions,
): string {
  const persona = getPersona(options.personaId);
  const invalid =
    options.invalid === true ||
    personaForcesInvalid(persona, options.label, options.kind);
  return generateValue({
    label: options.label,
    kind: options.kind,
    maxLength: options.maxLength,
    invalid,
  });
}
