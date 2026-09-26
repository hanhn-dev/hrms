"use client";

import { CheckOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";
import { useState } from "react";
import { useSwitchEnvironment } from "@/shared/ui/environment-select";

const SHORT_LABELS: Record<string, string> = {
  REPLICA: "REP",
};

function shortEnvironmentLabel(name: string): string {
  return SHORT_LABELS[name] ?? (name.length <= 4 ? name : name.slice(0, 3));
}

export function CollapsedEnvironmentPicker({
  environment,
  environments,
}: {
  environment: string;
  environments: string[];
}): React.JSX.Element | null {
  const switchEnvironment = useSwitchEnvironment(environment);
  const [open, setOpen] = useState(false);

  if (environments.length === 0) {
    return null;
  }

  return (
    <Dropdown
      getPopupContainer={() => document.body}
      open={open}
      placement="rightBottom"
      trigger={["click"]}
      onOpenChange={setOpen}
      popupRender={() => (
        <div className="min-w-44 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200">
          <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Environment
          </div>
          {environments.map((name) => {
            const selected = name === environment;
            return (
              <button
                key={name}
                className={`flex w-full items-center justify-between gap-6 border-0 bg-transparent px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${
                  selected ? "bg-slate-50 font-medium text-slate-900" : "text-slate-600"
                }`}
                type="button"
                onClick={() => {
                  switchEnvironment(name);
                  setOpen(false);
                }}
              >
                <span>{name}</span>
                {selected ? (
                  <CheckOutlined className="text-xs text-slate-400" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    >
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Database environment: ${environment}`}
        className="flex w-full items-center justify-center rounded-md border-0 bg-slate-100 px-1 py-1.5 text-xs font-semibold tracking-wide text-slate-700 hover:bg-slate-200"
        type="button"
      >
        {shortEnvironmentLabel(environment)}
      </button>
    </Dropdown>
  );
}
