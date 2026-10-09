export const REPO_IDS = ["hrms-db", "sourcecode", "hrms-sdk"] as const;

export type RepoId = (typeof REPO_IDS)[number];

export type SourceRef = {
  repo: RepoId;
  path: string;
  line: number;
  column: number;
};

export type FlowNodeKind = "screen" | "sdkCall" | "route" | "handler" | "procedure";

export type FlowNode = {
  id: string;
  kind: FlowNodeKind;
  label: string;
  detail: string;
  source: SourceRef | null;
  incomplete: boolean;
  gap: string | null;
};

export type FlowEdge = {
  id: string;
  from: string;
  to: string;
  kind: "http" | "handles" | "exec";
  label: string;
  confidence: "extracted";
  sectionKey: string | null;
  source: SourceRef | null;
};

export type FlowGraph = {
  version: 1;
  nodes: FlowNode[];
  edges: FlowEdge[];
  stats: {
    procedures: number;
    routes: number;
    unmatchedRoutes: number;
    unmatchedSdkCalls: number;
    dynamicSqlFiles: number;
  };
};

export type TextFile = {
  relativePath: string;
  source: string;
};

export type ProcedureFile = TextFile & {
  database: string;
};
