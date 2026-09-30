import type { DatabaseObjectKind } from "@/features/dbs/queries";

export const KIND_COLOR: Record<DatabaseObjectKind, string> = {
  table: "#1677ff",
  view: "#722ed1",
  storedProcedure: "#fa8c16",
  function: "#13c2c2",
  trigger: "#eb2f96",
  sequence: "#52c41a",
};

export const KIND_LABEL: Record<DatabaseObjectKind, string> = {
  table: "Table",
  view: "View",
  storedProcedure: "Stored Procedure",
  function: "Function",
  trigger: "Trigger",
  sequence: "Sequence",
};

export const SCHEMA_CHIP_COLOR = "geekblue";

export const FK_CHIP_COLOR = "#d48806";
