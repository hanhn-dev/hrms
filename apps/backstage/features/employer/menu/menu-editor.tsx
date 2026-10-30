"use client";

import { useEffect, useState } from "react";
import { Button, Empty, Input, Space, Switch, Tree } from "antd";
import type { TreeDataNode, TreeProps } from "antd";
import { useRouter } from "next/navigation";
import {
  flattenMenuTree,
  moveMenuNode,
  type FlatMenuEdit,
  type MenuNode,
} from "@hrms/db/menu-tree";
import { insertMenuNode, removeMenuLeaf } from "@/features/employer/menu/menu-edit";
import {
  commitSaveEmployerMenu,
  previewSaveEmployerMenu,
} from "@/features/employer/menu/mutations";
import { searchTemplateMenus } from "@/features/employer/menu/queries";
import { ConfirmWriteModal, HighlightMatch, SearchSelect, Text } from "@/shared/ui";

const SEARCH_WAIT_MS = 250;
const WRITES_OFF = "Writes are disabled.";

type MenuTreeDataNode = TreeDataNode & {
  menu: MenuNode;
  children?: MenuTreeDataNode[];
};

export function MenuEditor({
  employerId,
  inherited,
  nodes: initialNodes,
  writesEnabled,
}: {
  employerId: number;
  inherited: boolean;
  nodes: MenuNode[];
  writesEnabled: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const [nodes, setNodes] = useState(initialNodes);
  const [selectedId, setSelectedId] = useState<number | null>(initialNodes[0]?.menuId ?? null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string[]>(() => collectKeys(initialNodes));
  const [addOpen, setAddOpen] = useState(false);
  const [templateOptions, setTemplateOptions] = useState<Array<{ value: number; label: string }>>([]);
  const debouncedQuery = useDebouncedValue(query.trim().toLowerCase(), SEARCH_WAIT_MS);
  const searching = debouncedQuery.length >= 2;
  const visible = searching ? filterNodes(nodes, debouncedQuery) : nodes;
  const selected = findNode(visible, selectedId);
  const dirty = flattenKey(nodes) !== flattenKey(initialNodes);
  const shownExpanded = searching ? collectKeys(visible) : expanded;

  async function loadTemplateOptions(value: string): Promise<void> {
    const page = await searchTemplateMenus(employerId, value);
    const present = new Set(flattenMenuTree(nodes).map((row) => row.menuId));
    setTemplateOptions(
      page.rows
        .filter((row) => !present.has(row.menuId))
        .map((row) => ({
          value: row.menuId,
          label: row.menuName ?? `Menu ${row.menuId}`,
        })),
    );
  }

  const onDrop: TreeProps["onDrop"] = (info) => {
    const dragId = Number(info.dragNode.key);
    const targetId = Number(info.node.key);
    const dropPos = String(info.node.pos).split("-");
    const relative = info.dropPosition - Number(dropPos[dropPos.length - 1]);
    const place = info.dropToGap ? (relative < 0 ? "before" : "after") : "inside";
    setNodes(moveMenuNode(nodes, dragId, targetId, place));
  };

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <Text type="secondary">
        Drag an item to move it. Select an item to rename it or hide it.
        {inherited ? " Saving creates a menu just for this organization." : ""}
      </Text>
      <Space wrap>
        <Input
          allowClear
          placeholder="Search the menu"
          style={{ width: 280 }}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
        {employerId !== 0 ? (
          <Button
            disabled={!writesEnabled}
            onClick={() => {
              setAddOpen(true);
              void loadTemplateOptions("");
            }}
          >
            Add an item
          </Button>
        ) : null}
        <ConfirmWriteModal
          buttonLabel="Save"
          disabled={!writesEnabled || !dirty}
          disabledReason={writesEnabled ? "No changes to save." : WRITES_OFF}
          onDone={() => {
            router.refresh();
          }}
          previewAction={() =>
            previewSaveEmployerMenu({
              employerId,
              nodes: flattenMenuTree(nodes),
            })
          }
          commitAction={commitSaveEmployerMenu}
          successMessage="Menu saved. People need to sign out and back in to see it."
          title="Save this menu"
        />
      </Space>
      {searching ? <Text type="secondary">Drag is off while a search is applied.</Text> : null}
      {visible.length === 0 ? (
        <Empty description="No menu items." />
      ) : (
        <Tree
          blockNode
          draggable={!searching && writesEnabled}
          expandedKeys={shownExpanded}
          height={560}
          selectedKeys={selectedId == null ? [] : [String(selectedId)]}
          treeData={toTreeData(visible, debouncedQuery)}
          onDrop={onDrop}
          onExpand={(keys) => {
            if (!searching) {
              setExpanded(keys.map(String));
            }
          }}
          onSelect={(keys) => {
            const next = Number(keys[0]);
            setSelectedId(Number.isInteger(next) ? next : null);
          }}
        />
      )}
      {selected ? (
        <Space orientation="vertical">
          <Text>Name</Text>
          <Input
            maxLength={200}
            value={selected.menuName}
            onChange={(event) => {
              setNodes(patchNode(nodes, selected.menuId, { menuName: event.target.value }));
            }}
          />
          <Space>
            <Text>Show in the menu</Text>
            <Switch
              checked={selected.isActive}
              onChange={(checked) => {
                setNodes(patchNode(nodes, selected.menuId, { isActive: checked }));
              }}
            />
          </Space>
          <Button
            danger
            disabled={selected.children.length > 0}
            onClick={() => {
              setNodes(removeMenuLeaf(nodes, selected.menuId));
              setSelectedId(null);
            }}
          >
            Remove
          </Button>
          {selected.children.length > 0 ? (
            <Text type="secondary">Move its children somewhere else before removing it.</Text>
          ) : null}
        </Space>
      ) : (
        <Text type="secondary">Select an item to rename it, hide it, or remove it.</Text>
      )}
      {addOpen ? (
        <SearchSelect
          autoFocus
          filterOption={false}
          open
          options={templateOptions}
          placeholder="Search the standard menu"
          style={{ width: 360 }}
          onOpenChange={(open) => {
            if (!open) {
              setAddOpen(false);
            }
          }}
          onSearch={(value) => {
            void loadTemplateOptions(value);
          }}
          onSelect={(value: number) => {
            const option = templateOptions.find((item) => item.value === value);
            setNodes(
              insertMenuNode(nodes, selected ? selected.menuId : null, {
                menuId: value,
                menuName: option?.label ?? `Menu ${value}`,
              }),
            );
            setSelectedId(value);
            setAddOpen(false);
          }}
        />
      ) : null}
    </Space>
  );
}

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delayMs]);
  return debounced;
}

function toTreeData(nodes: MenuNode[], query: string): MenuTreeDataNode[] {
  return nodes.map((menu) => ({
    key: String(menu.menuId),
    menu,
    title: (
      <span>
        <HighlightMatch query={query} text={menu.menuName} />
        {menu.isActive ? null : <Text type="secondary"> (inactive)</Text>}
        <Text type="secondary"> {menu.menuId}</Text>
      </span>
    ),
    children: toTreeData(menu.children, query),
  }));
}

function filterNodes(nodes: MenuNode[], query: string): MenuNode[] {
  const kept: MenuNode[] = [];
  for (const node of nodes) {
    const children = filterNodes(node.children, query);
    const self = `${node.menuName} ${node.menuId}`.toLowerCase().includes(query);
    if (self || children.length > 0) {
      kept.push({ ...node, children });
    }
  }
  return kept;
}

function findNode(nodes: MenuNode[], menuId: number | null): MenuNode | null {
  if (menuId == null) {
    return null;
  }
  for (const node of nodes) {
    if (node.menuId === menuId) {
      return node;
    }
    const nested = findNode(node.children, menuId);
    if (nested) {
      return nested;
    }
  }
  return null;
}

function patchNode(nodes: MenuNode[], menuId: number, patch: Partial<MenuNode>): MenuNode[] {
  return nodes.map((node) => {
    if (node.menuId === menuId) {
      return { ...node, ...patch, children: node.children };
    }
    return { ...node, children: patchNode(node.children, menuId, patch) };
  });
}

function collectKeys(nodes: MenuNode[]): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    if (node.children.length > 0) {
      keys.push(String(node.menuId));
      keys.push(...collectKeys(node.children));
    }
  }
  return keys;
}

function flattenKey(nodes: MenuNode[]): string {
  return flattenMenuTree(nodes)
    .map((row: FlatMenuEdit) => `${row.menuId}|${row.parentMenuId ?? ""}|${row.menuName}|${row.isActive ? 1 : 0}`)
    .join("\n");
}
