import type { FieldKind } from "@/shared/messaging";
import { generateDateRange, generateValue } from "@/shared/generators";
import {
  generateValueForPersona,
  type PersonaId,
} from "@/features/personas";

/** Built-in My Details–oriented scenario packs. */
export type ScenarioId =
  | "none"
  | "bank-india"
  | "employment-dates"
  | "contact";

export type ScenarioOverrideMode = "fixed" | "valid" | "invalid";

export interface ScenarioOverride {
  /** Case-insensitive label substring or regex source. */
  match: string;
  mode: ScenarioOverrideMode;
  /** Required when mode is `fixed`. */
  value?: string;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  name: string;
  description: string;
  overrides: readonly ScenarioOverride[];
}

/**
 * Known-shape IFSC for bank forms. Validate may still fail without master data;
 * the code itself matches the IFSC pattern used by generators.
 */
export const SCENARIO_IFSC_FIXTURE = "HDFC0001234";

export const SCENARIOS: readonly ScenarioDefinition[] = [
  {
    id: "none",
    name: "No scenario",
    description: "Use the active persona only.",
    overrides: [],
  },
  {
    id: "bank-india",
    name: "Bank (India)",
    description:
      "Fixed IFSC fixture plus valid account / bank-related fields; click Validate after IFSC when present.",
    overrides: [
      { match: "ifsc", mode: "fixed", value: SCENARIO_IFSC_FIXTURE },
      { match: "bank identifier", mode: "fixed", value: SCENARIO_IFSC_FIXTURE },
      { match: "account number", mode: "fixed", value: "50100234567890" },
      { match: "account holder", mode: "valid" },
      { match: "bank name", mode: "valid" },
      { match: "branch", mode: "valid" },
    ],
  },
  {
    id: "employment-dates",
    name: "Employment dates",
    description:
      "Coherent From/To date range; other fields follow the active persona.",
    overrides: [
      { match: "^from$", mode: "valid" },
      { match: "^to$", mode: "valid" },
    ],
  },
  {
    id: "contact",
    name: "Contact",
    description: "Valid email, phone, and address-style fields.",
    overrides: [
      { match: "email", mode: "valid" },
      { match: "mobile|phone|tel", mode: "valid" },
      { match: "address", mode: "valid" },
      { match: "contact person", mode: "valid" },
    ],
  },
] as const;

export const DEFAULT_SCENARIO_ID: ScenarioId = "none";

export function isScenarioId(value: unknown): value is ScenarioId {
  return (
    typeof value === "string" &&
    SCENARIOS.some((scenario) => scenario.id === value)
  );
}

export function getScenario(
  id: ScenarioId | undefined | null,
): ScenarioDefinition {
  const match = SCENARIOS.find((scenario) => scenario.id === id);
  return match ?? SCENARIOS[0]!;
}

function normalizeLabel(label: string): string {
  return label.replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function findOverride(
  scenario: ScenarioDefinition,
  label: string,
): ScenarioOverride | undefined {
  const normalized = normalizeLabel(label);
  return scenario.overrides.find((override) => {
    try {
      return new RegExp(override.match, "i").test(normalized);
    } catch {
      return normalized.includes(override.match.toLowerCase());
    }
  });
}

export interface ScenarioValueContext {
  label: string;
  kind: FieldKind;
  maxLength?: number | null;
  personaId?: PersonaId | null;
  scenarioId?: ScenarioId | null;
  /** Shared From/To pair for employment-dates / date fields. */
  dateRange?: { from: string; to: string };
}

function isDateLike(label: string, kind: FieldKind): boolean {
  const normalized = normalizeLabel(label);
  return kind === "date" || normalized === "from" || normalized === "to";
}

/**
 * Resolve the value to fill for a field: scenario override → persona → generator.
 * From/To always use a coherent shared dateRange when provided.
 */
export function resolveScenarioValue(context: ScenarioValueContext): string {
  const scenario = getScenario(context.scenarioId);
  const override = findOverride(scenario, context.label);
  const labelLower = normalizeLabel(context.label);
  const dateRange = context.dateRange ?? generateDateRange();

  if (isDateLike(context.label, context.kind)) {
    return labelLower === "to" ? dateRange.to : dateRange.from;
  }

  if (override) {
    if (override.mode === "fixed" && override.value != null) {
      const max = context.maxLength;
      if (max != null && max > 0) {
        return override.value.slice(0, max);
      }
      return override.value;
    }
    if (override.mode === "invalid") {
      return generateValue({
        label: context.label,
        kind: context.kind,
        maxLength: context.maxLength,
        invalid: true,
      });
    }
    // mode === "valid" — ignore persona invalid-contact for this field
    return generateValue({
      label: context.label,
      kind: context.kind,
      maxLength: context.maxLength,
      invalid: false,
    });
  }

  return generateValueForPersona({
    label: context.label,
    kind: context.kind,
    maxLength: context.maxLength,
    personaId: context.personaId,
  });
}
