"use client";

import { Select } from "antd";
import { useRouter } from "next/navigation";
import { setTroubleshooterEnvironment } from "@/shared/db/set-environment";

export function useSwitchEnvironment(current: string): (next: string) => void {
  const router = useRouter();
  return (next: string) => {
    if (next === current) {
      return;
    }
    void setTroubleshooterEnvironment(next).then(() => {
      router.refresh();
    });
  };
}

export function EnvironmentSelect({
  environment,
  environments,
  className,
}: {
  environment: string;
  environments: string[];
  className?: string;
}): React.JSX.Element | null {
  const switchEnvironment = useSwitchEnvironment(environment);
  if (environments.length === 0) {
    return null;
  }
  return (
    <Select
      aria-label="Database environment"
      className={className}
      popupMatchSelectWidth={false}
      size="small"
      value={environment}
      variant="borderless"
      options={environments.map((name) => ({ label: name, value: name }))}
      onClick={(event) => {
        event.stopPropagation();
      }}
      onChange={switchEnvironment}
    />
  );
}
