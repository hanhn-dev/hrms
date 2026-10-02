"use client";

import { useEffect } from "react";
import { saveRecentEmployee } from "@/features/employee/recent/recent-employees";

export function RememberRecentEmployee({
  employerId,
  employmentNumber,
  fullName,
}: {
  employerId: number;
  employmentNumber: string;
  fullName: string;
}): null {
  useEffect(() => {
    saveRecentEmployee(
      localStorage,
      employerId,
      { employmentNumber, fullName },
      new Date().toISOString(),
    );
  }, [employerId, employmentNumber, fullName]);

  return null;
}
