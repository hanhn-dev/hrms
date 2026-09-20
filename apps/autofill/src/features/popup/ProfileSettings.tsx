import { Select, Typography } from "antd";
import { PERSONAS, type PersonaId } from "@/features/personas";
import { SCENARIOS, type ScenarioId } from "@/features/scenarios";
import type { AutofillSettings } from "@/shared/messaging";

export interface ProfileSettingsProps {
  settings: AutofillSettings;
  onChange: (patch: Partial<AutofillSettings>) => void;
}

export function ProfileSettings({ settings, onChange }: ProfileSettingsProps) {
  return (
    <div className="autofill:flex autofill:flex-col autofill:gap-2">
      <Typography.Text strong>Fill profile</Typography.Text>
      <Typography.Text type="secondary" className="autofill:text-xs">
        Persona controls valid vs invalid contact fields. Scenario packs apply
        My Details–oriented fixtures (bank IFSC, dates, contact).
      </Typography.Text>
      <Typography.Text type="secondary">Persona</Typography.Text>
      <Select
        value={settings.activePersonaId}
        options={PERSONAS.map((persona) => ({
          value: persona.id,
          label: persona.name,
          title: persona.description,
        }))}
        onChange={(activePersonaId: PersonaId) => onChange({ activePersonaId })}
        className="autofill:w-full"
      />
      <Typography.Text type="secondary">Scenario pack</Typography.Text>
      <Select
        value={settings.activeScenarioId}
        options={SCENARIOS.map((scenario) => ({
          value: scenario.id,
          label: scenario.name,
          title: scenario.description,
        }))}
        onChange={(activeScenarioId: ScenarioId) =>
          onChange({ activeScenarioId })
        }
        className="autofill:w-full"
      />
    </div>
  );
}
