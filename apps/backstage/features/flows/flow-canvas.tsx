"use client";

import { useMemo } from "react";
import {
  Background,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { layoutCallGraph } from "./flow-layout";
import type { FlowEdge, FlowNode } from "./model";

type FlowNodeData = {
  label: string;
  detail: string;
  href: string | null;
  gap: string | null;
  width: number;
  height: number;
  selected: boolean;
  onSelect: (() => void) | null;
};

function CallNode({ data }: NodeProps & { data: FlowNodeData }): React.JSX.Element {
  const nameClass = "break-all text-left font-medium leading-5";
  const name = data.onSelect ? (
    <button className={`${nameClass} text-sky-700 hover:underline dark:text-sky-300`} type="button" onClick={data.onSelect}>
      {data.label}
    </button>
  ) : data.href ? (
    <a className={`${nameClass} block text-sky-700 hover:underline dark:text-sky-300`} href={data.href}>
      {data.label}
    </a>
  ) : (
    <div className={nameClass} title={data.label}>
      {data.label}
    </div>
  );
  return (
    <div
      className={`rounded-md border bg-white px-3 py-2 text-sm shadow-sm dark:bg-slate-900 ${
        data.selected ? "border-sky-500" : "border-slate-300 dark:border-slate-600"
      }`}
      style={{ width: data.width, height: data.height }}
    >
      <Handle type="target" position={Position.Left} />
      {name}
      <div className="text-xs text-slate-500">{data.detail}</div>
      {data.gap ? <div className="mt-1 break-words text-xs leading-4 text-amber-700">{data.gap}</div> : null}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { call: CallNode };

export function FlowCanvas(props: {
  nodes: readonly FlowNode[];
  edges: readonly FlowEdge[];
  hrefFor: (nodeId: string) => string | null;
  selectedId: string | null;
  onSelectProcedure: (nodeId: string) => void;
}): React.JSX.Element {
  const layout = useMemo(() => {
    const placed = layoutCallGraph(props.nodes, props.edges);
    const byId = new Map(props.nodes.map((node) => [node.id, node]));
    const nodes: Node<FlowNodeData>[] = placed.nodes.flatMap((placedNode) => {
      const node = byId.get(placedNode.id);
      if (!node) return [];
      return [
        {
          id: node.id,
          type: "call",
          position: { x: placedNode.x, y: placedNode.y },
          width: placedNode.width,
          height: placedNode.height,
          data: {
            label: node.label,
            detail: node.detail,
            href: props.hrefFor(node.id),
            gap: node.gap,
            width: placedNode.width,
            height: placedNode.height,
            selected: node.id === props.selectedId,
            onSelect: node.kind === "procedure" ? () => props.onSelectProcedure(node.id) : null,
          },
        },
      ];
    });
    const edges: Edge[] = placed.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      label: edge.label ?? undefined,
      labelShowBg: true,
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
      style: { stroke: "#64748b" },
    }));
    return { nodes, edges };
  }, [props]);

  if (props.nodes.length === 0) {
    return <p className="text-sm text-slate-500">This step does not call another stored procedure.</p>;
  }

  return (
    <ReactFlowProvider>
      <div className="h-[28rem] rounded-md border border-slate-200 dark:border-slate-700">
        <ReactFlow fitView fitViewOptions={{ padding: 0.2 }} nodes={layout.nodes} edges={layout.edges} nodeTypes={nodeTypes}>
          <Background />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}
