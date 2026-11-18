"use client";

import type { DefaultEdgeOptions, NodeProps, NodeTypes } from "@xyflow/react";
import {
  SchemaNode,
  type SchemaNodeData,
} from "@/features/dbs/canvas/schema-node";

type SchemaProps = NodeProps & { data: SchemaNodeData };

type CanvasNodeRegistry = {
  schemaRenderer: { current: (props: SchemaProps) => React.JSX.Element };
  nodeTypes: NodeTypes;
  defaultEdgeOptions: DefaultEdgeOptions;
};

const REGISTRY_KEY = "__hrmsDbsCanvasNodeTypes";

/**
 * Keep a process-wide React Flow registry so Fast Refresh can swap the
 * SchemaNode implementation without replacing the function identity that
 * React Flow compares (dev error #002).
 */
function getCanvasNodeRegistry(): CanvasNodeRegistry {
  const globalStore = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: CanvasNodeRegistry;
  };

  if (!globalStore[REGISTRY_KEY]) {
    const schemaRenderer = {
      current: SchemaNode as (props: SchemaProps) => React.JSX.Element,
    };

    function StableSchemaNode(props: SchemaProps): React.JSX.Element {
      return schemaRenderer.current(props);
    }

    globalStore[REGISTRY_KEY] = {
      schemaRenderer,
      nodeTypes: { schema: StableSchemaNode },
      defaultEdgeOptions: {
        className: "database-edge",
        style: {
          stroke: "#0891b2",
          strokeWidth: 2,
          strokeDasharray: "7 5",
        },
      },
    };
  } else {
    globalStore[REGISTRY_KEY].schemaRenderer.current = SchemaNode as (
      props: SchemaProps,
    ) => React.JSX.Element;
  }

  return globalStore[REGISTRY_KEY];
}

const registry = getCanvasNodeRegistry();

export const canvasNodeTypes = registry.nodeTypes;
export const canvasDefaultEdgeOptions = registry.defaultEdgeOptions;
