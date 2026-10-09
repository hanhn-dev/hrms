export type ObjectColumn = {
  name: string;
  dataType: string;
  nullable: boolean;
  primaryKey: boolean;
};

export type ObjectPanelResult =
  | {
      found: false;
      schema: string;
      name: string;
      message: string;
    }
  | {
      found: true;
      schema: string;
      name: string;
      kind: "table";
      columns: ObjectColumn[];
      docHref: string | null;
    }
  | {
      found: true;
      schema: string;
      name: string;
      kind: "storedProcedure" | "function" | "view";
      definition: string | null;
      unavailableReason: string | null;
      docHref: string | null;
    };

/** Lines from `formatTableDefinitionLine`: `Name type [IDENTITY] NULL|NOT NULL [PK]`. */
export function columnsFromDefinitionLines(lines: readonly string[]): ObjectColumn[] {
  const columns: ObjectColumn[] = [];
  for (const line of lines) {
    const match = /^(\S+) (\S+)(?: IDENTITY)? (NOT NULL|NULL)(?: PK)?$/.exec(line);
    if (!match) continue;
    columns.push({
      name: match[1]!,
      dataType: match[2]!,
      nullable: match[3] === "NULL",
      primaryKey: line.endsWith(" PK"),
    });
  }
  return columns;
}
