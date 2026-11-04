"use client";

import { createContext, useContext } from "react";

export const ProgressMemberFilterContext = createContext<readonly string[]>([]);

export function useProgressMemberFilter(): readonly string[] {
  return useContext(ProgressMemberFilterContext);
}
