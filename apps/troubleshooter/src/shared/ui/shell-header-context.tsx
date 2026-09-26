"use client";

import { createContext, useContext, useLayoutEffect, useMemo, useState } from "react";

type ShellHeaderContextValue = {
  employeeLabel: string | null;
  setEmployeeLabel: (label: string | null) => void;
};

const ShellHeaderContext = createContext<ShellHeaderContextValue | null>(null);

export function ShellHeaderProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [employeeLabel, setEmployeeLabel] = useState<string | null>(null);
  const value = useMemo(
    () => ({ employeeLabel, setEmployeeLabel }),
    [employeeLabel],
  );

  return (
    <ShellHeaderContext.Provider value={value}>
      {children}
    </ShellHeaderContext.Provider>
  );
}

export function useShellEmployeeLabel(): string | null {
  return useContext(ShellHeaderContext)?.employeeLabel ?? null;
}

export function EmployeeHeaderLabel({
  label,
}: {
  label: string;
}): null {
  const context = useContext(ShellHeaderContext);

  useLayoutEffect(() => {
    if (!context) {
      return;
    }
    context.setEmployeeLabel(label);
    return () => {
      context.setEmployeeLabel(null);
    };
  }, [context, label]);

  return null;
}
