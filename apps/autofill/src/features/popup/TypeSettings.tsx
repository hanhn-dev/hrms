import { Checkbox, Slider, Typography } from "antd";
import type { AutofillSettings } from "@/shared/messaging";

export interface TypeSettingsProps {
  settings: AutofillSettings;
  onChange: (patch: Partial<AutofillSettings>) => void;
}

export function TypeSettings({ settings, onChange }: TypeSettingsProps) {
  return (
    <div className="autofill:flex autofill:flex-col autofill:gap-2">
      <Typography.Text type="secondary">Typing delay (ms)</Typography.Text>
      <Slider
        min={0}
        max={200}
        step={10}
        value={settings.typingDelayMs}
        onChange={(typingDelayMs) => onChange({ typingDelayMs })}
        tooltip={{ formatter: (v) => `${v} ms` }}
      />
      <Checkbox
        checked={settings.startWithInvalid}
        onChange={(e) => onChange({ startWithInvalid: e.target.checked })}
      >
        Start with invalid value (show validation)
      </Checkbox>
    </div>
  );
}
