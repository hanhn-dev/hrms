import {
  PLAN_ICON_SIZE,
  PLAN_ICON_TOP,
  PLAN_NODE_HEIGHT,
  PLAN_NODE_WIDTH,
  layoutPlan,
} from "./layout.ts";
import { formatCount, parseShowplan } from "./parse.ts";
import type { LayoutNode, PlanNode } from "./types.ts";

const STYLE_ID = "hrms-showplan-style";
const SVG_NS = "http://www.w3.org/2000/svg";

const ICON_POSITION: Record<string, string> = {
  Catchall: "-96px -256px",
  ArithmeticExpression: "0 0",
  Assert: "-32px 0",
  Assign: "-64px 0",
  Bitmap: "-256px -192px",
  BookmarkLookup: "-128px 0",
  ClusteredIndexDelete: "-160px 0",
  ClusteredIndexInsert: "-192px 0",
  ClusteredIndexScan: "-224px 0",
  ClusteredIndexSeek: "-256px 0",
  ClusteredIndexMerge: "0 -256px",
  KeyLookup: "-256px 0",
  ClusteredIndexUpdate: "-288px 0",
  Collapse: "0 -32px",
  ComputeScalar: "-32px -32px",
  Concatenation: "-64px -32px",
  ConstantScan: "-96px -32px",
  Convert: "-128px -32px",
  Declare: "-160px -32px",
  Delete: "-288px -160px",
  DistributeStreams: "-224px -32px",
  Dynamic: "-256px -32px",
  EagerSpool: "-192px -160px",
  FetchQuery: "-288px -32px",
  Filter: "0 -64px",
  GatherStreams: "-32px -64px",
  HashMatch: "-64px -64px",
  If: "-96px -64px",
  Insert: "0 -192px",
  InsertedScan: "-128px -64px",
  Intrinsic: "-160px -64px",
  Keyset: "-192px -64px",
  LazySpool: "-192px -160px",
  LogRowScan: "-224px -64px",
  MergeInterval: "-256px -64px",
  MergeJoin: "-288px -64px",
  NestedLoops: "0 -96px",
  IndexScan: "-96px -96px",
  IndexSeek: "-128px -96px",
  IndexSpool: "-160px -96px",
  IndexInsert: "-64px -96px",
  IndexDelete: "-32px -96px",
  IndexUpdate: "-192px -96px",
  OnlineIndexInsert: "-224px -96px",
  ParameterTableScan: "-256px -96px",
  PopulateQuery: "-192px -224px",
  RefreshQuery: "-32px -128px",
  RemoteQuery: "-128px -128px",
  RemoteScan: "-160px -128px",
  RepartitionStreams: "-224px -128px",
  Result: "-256px -128px",
  RowCountSpool: "-288px -128px",
  Segment: "0 -160px",
  Sequence: "-32px -160px",
  SequenceProject: "-224px -224px",
  SnapShot: "-256px -224px",
  Sort: "-128px -160px",
  Split: "-160px -160px",
  Spool: "-192px -160px",
  Statement: "-256px -128px",
  StreamAggregate: "-224px -160px",
  Switch: "-256px -160px",
  TableDelete: "-288px -160px",
  TableInsert: "0 -192px",
  TableScan: "-32px -192px",
  TableSpool: "-64px -192px",
  TableUpdate: "-96px -192px",
  TableValuedFunction: "-128px -192px",
  Top: "-160px -192px",
  Update: "-96px -192px",
  While: "-224px -192px",
  StmtCursor: "-96px -256px",
  StmtCond: "0 -224px",
  FastForward: "-96px 0",
  WindowAggregate: "-160px -256px",
  AdaptiveJoin: "-288px -224px",
  ColumnStoreIndexScan: "-128px -224px",
  ColumnStoreIndexInsert: "-64px -224px",
  ColumnStoreIndexDelete: "-32px -224px",
  ColumnStoreIndexUpdate: "-160px -224px",
  ColumnStoreIndexMerge: "-96px -224px",
  DeletedScan: "-32px -256px",
  TableMerge: "-65px -256px",
  BatchHashTableBuild: "-128px -256px",
};

const CSS = `
.hrms-plan { font: 11px/1.25 "Segoe UI", ui-sans-serif, system-ui, sans-serif; color: #333; }
.hrms-plan-statement + .hrms-plan-statement { margin-top: 16px; }
.hrms-plan-sql { white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; margin: 0 0 8px; }
.hrms-plan-missing { margin: 0 0 8px; padding-left: 1.2em; color: #237804; }
.hrms-plan-canvas { position: relative; }
.hrms-plan-lines { position: absolute; inset: 0; overflow: visible; pointer-events: none; }
.hrms-plan-lines path { fill: none; stroke: #6e6e6e; stroke-width: 1; }
.hrms-plan-node { position: absolute; box-sizing: border-box; width: ${PLAN_NODE_WIDTH}px; height: ${PLAN_NODE_HEIGHT}px; text-align: center; }
.hrms-plan-cost { height: ${PLAN_ICON_TOP}px; }
.hrms-plan-icon { position: relative; width: ${PLAN_ICON_SIZE}px; height: ${PLAN_ICON_SIZE}px; margin: 0 auto; background-repeat: no-repeat; }
.hrms-plan-node[data-warning="true"] .hrms-plan-icon::after { content: ""; position: absolute; right: -1px; bottom: -1px; width: 0; height: 0; border-top: 8px solid transparent; border-right: 8px solid #f5a623; }
.hrms-plan-op, .hrms-plan-sub, .hrms-plan-obj { height: 14px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.hrms-plan-rows { position: absolute; transform: translate(-50%, -110%); background: #fff; padding: 0 2px; pointer-events: none; }
.hrms-plan-hover { position: absolute; z-index: 2; max-width: 360px; padding: 8px 10px; border: 1px solid #d9d9d9; background: #fffef2; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12); text-align: left; }
.hrms-plan-hover[hidden] { display: none; }
.hrms-plan-hover dt { font-weight: 600; }
.hrms-plan-hover dd { margin: 0 0 6px; white-space: pre-wrap; }
${Object.entries(ICON_POSITION)
  .map(
    ([name, position]) =>
      `.hrms-plan-icon[data-icon="${name}"] { background-position: ${position}; }`,
  )
  .join("\n")}
`;

export type ShowplanRenderOptions = {
  iconSheet?: string;
};

let markerId = 0;

export function renderShowplan(
  container: Element,
  xml: string,
  options: ShowplanRenderOptions = {},
): void {
  ensureStyles();
  container.replaceChildren();
  const statements = layoutPlan(parseShowplan(xml));
  if (statements.length === 0) {
    container.textContent = "The plan could not be read.";
    return;
  }

  const root = document.createElement("div");
  root.className = "hrms-plan";
  for (const statement of statements) {
    const section = document.createElement("section");
    section.className = "hrms-plan-statement";
    const sql = document.createElement("div");
    sql.className = "hrms-plan-sql";
    sql.textContent = statement.statement.text;
    section.append(sql);
    if (statement.statement.missingIndexes.length > 0) {
      const list = document.createElement("ul");
      list.className = "hrms-plan-missing";
      for (const index of statement.statement.missingIndexes) {
        const item = document.createElement("li");
        item.textContent = index;
        list.append(item);
      }
      section.append(list);
    }
    if (statement.roots.length > 0) {
      section.append(
        drawCanvas(
          statement.roots,
          statement.width,
          statement.height,
          options.iconSheet,
        ),
      );
    }
    root.append(section);
  }
  container.append(root);
}

function drawCanvas(
  roots: readonly LayoutNode[],
  width: number,
  height: number,
  iconSheet: string | undefined,
): HTMLElement {
  const canvas = document.createElement("div");
  canvas.className = "hrms-plan-canvas";
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "hrms-plan-lines");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  const marker = `hrms-plan-arrow-${markerId}`;
  markerId += 1;
  svg.append(arrowMarker(marker));
  canvas.append(svg);
  const hover = document.createElement("div");
  hover.className = "hrms-plan-hover";
  hover.hidden = true;
  for (const root of roots) {
    drawNode(canvas, svg, hover, root, 0, 0, marker, iconSheet);
  }
  canvas.append(hover);
  return canvas;
}

function arrowMarker(id: string): SVGMarkerElement {
  const marker = document.createElementNS(SVG_NS, "marker");
  marker.setAttribute("id", id);
  marker.setAttribute("markerWidth", "8");
  marker.setAttribute("markerHeight", "8");
  marker.setAttribute("refX", "7");
  marker.setAttribute("refY", "4");
  marker.setAttribute("orient", "auto");
  const head = document.createElementNS(SVG_NS, "path");
  head.setAttribute("d", "M 0 0 L 8 4 L 0 8 z");
  head.setAttribute("fill", "#6e6e6e");
  marker.append(head);
  return marker;
}

function drawNode(
  canvas: HTMLElement,
  svg: SVGSVGElement,
  hover: HTMLElement,
  layout: LayoutNode,
  originX: number,
  originY: number,
  marker: string,
  iconSheet: string | undefined,
): void {
  const x = originX + layout.x;
  const y = originY + layout.y + (layout.height - PLAN_NODE_HEIGHT) / 2;
  const card = document.createElement("div");
  card.className = "hrms-plan-node";
  if (layout.node.warnings.length > 0) {
    card.dataset.warning = "true";
  }
  card.style.left = `${x}px`;
  card.style.top = `${y}px`;
  card.append(
    text("hrms-plan-cost", percentLabel(layout.costPercent)),
    icon(layout.node, iconSheet),
    text("hrms-plan-op", layout.node.physicalOp),
    text("hrms-plan-sub", logicalCaption(layout.node)),
    text("hrms-plan-obj", objectCaption(layout.node.objectName)),
  );
  card.addEventListener("mouseenter", () => {
    showHover(hover, layout.node, x + PLAN_NODE_WIDTH + 8, y);
  });
  card.addEventListener("mouseleave", () => {
    hover.hidden = true;
  });
  canvas.append(card);

  const slotTop = originY + layout.y;
  for (const child of layout.children) {
    const childLeft = x + child.x;
    const childTop = slotTop + child.y + (child.height - PLAN_NODE_HEIGHT) / 2;
    const x1 = x + PLAN_NODE_WIDTH / 2 + PLAN_ICON_SIZE / 2;
    const y1 = y + PLAN_ICON_TOP + PLAN_ICON_SIZE / 2;
    const x2 = childLeft + PLAN_NODE_WIDTH / 2 - PLAN_ICON_SIZE / 2;
    const y2 = childTop + PLAN_ICON_TOP + PLAN_ICON_SIZE / 2;
    const mid = (x1 + x2) / 2;
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", `M ${x2} ${y2} H ${mid} V ${y1} H ${x1}`);
    path.setAttribute("marker-end", `url(#${marker})`);
    svg.append(path);
    const rows = child.node.actualRows ?? child.node.estimateRows;
    if (rows != null) {
      const label = document.createElement("span");
      label.className = "hrms-plan-rows";
      label.textContent = formatCount(rows) ?? "";
      label.style.left = `${(mid + x2) / 2}px`;
      label.style.top = `${y2}px`;
      canvas.append(label);
    }
    drawNode(canvas, svg, hover, child, x, slotTop, marker, iconSheet);
  }
}

function icon(node: PlanNode, iconSheet: string | undefined): HTMLElement {
  const element = document.createElement("div");
  element.className = "hrms-plan-icon";
  element.dataset.icon = iconKey(node);
  if (iconSheet) {
    element.style.backgroundImage = `url("${iconSheet}")`;
  }
  return element;
}

function iconKey(node: PlanNode): string {
  if (node.id === "statement") {
    return node.physicalOp === "IF" ? "StmtCond" : "Statement";
  }
  const physical = node.physicalOp.replaceAll(" ", "");
  if (physical === "Parallelism") {
    const logical = node.logicalOp.replaceAll(" ", "");
    return ICON_POSITION[logical] ? logical : "Catchall";
  }
  return ICON_POSITION[physical] ? physical : "Catchall";
}

function text(className: string, value: string): HTMLElement {
  const row = document.createElement("div");
  row.className = className;
  row.textContent = value;
  return row;
}

function percentLabel(value: number | null): string {
  if (value == null || !Number.isFinite(value)) {
    return "0%";
  }
  return `${Math.round(value)}%`;
}

function logicalCaption(node: PlanNode): string {
  if (node.logicalOp === "" || node.logicalOp === node.physicalOp) {
    return "";
  }
  return `(${node.logicalOp})`;
}

function objectCaption(name: string | null): string {
  if (name == null || name === "") {
    return "";
  }
  const match = /^(?:[^.]+)\.(?<table>.+?)(?: \((?<index>.+)\))?$/.exec(name);
  const table = match?.groups?.table?.trim();
  const index = match?.groups?.index?.trim();
  if (table && index) {
    return `[${table}].[${index}]`;
  }
  if (table) {
    return `[${table}]`;
  }
  return name;
}

function showHover(
  hover: HTMLElement,
  node: PlanNode,
  left: number,
  top: number,
): void {
  hover.replaceChildren();
  const title = document.createElement("div");
  title.className = "hrms-plan-op";
  title.textContent = node.physicalOp;
  hover.append(title);
  const list = document.createElement("dl");
  for (const property of node.properties) {
    const label = document.createElement("dt");
    label.textContent = property.label;
    const value = document.createElement("dd");
    value.textContent = property.value;
    list.append(label, value);
  }
  hover.append(list);
  hover.style.left = `${left}px`;
  hover.style.top = `${top}px`;
  hover.hidden = false;
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.append(style);
}
