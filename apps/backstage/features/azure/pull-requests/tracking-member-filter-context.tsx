"use client";

import { createContext, useContext } from "react";

export const TrackingMemberFilterContext = createContext<readonly string[]>([]);

export function useTrackingMemberFilter(): readonly string[] {
  return useContext(TrackingMemberFilterContext);
}
