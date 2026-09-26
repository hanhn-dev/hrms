"use client";

import { Button, Form, Input, Select, Space, Tag, Tree, Typography } from "antd";
import type { TreeDataNode, TreeProps } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  commitGrantRevokeUserPages,
  previewGrantRevokeUserPages,
} from "@/features/employee/access/mutations";
import {
  collectExpandableMenuKeys,
  parseAccessKey,
  type AccessNode,
  type AccessRow,
} from "@/features/employee/access/menu-tree";
import { ConfirmWriteModal } from "@/shared/ui";

const SEARCH_DEBOUNCE_MS = 250;
const TREE_VIEWPORT_HEIGHT = 560;
const EMPTY_KEYS: React.Key[] = [];

function useDebouncedValue<T>(value: T, delayMs: number): T {
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

type MenuTreeDataNode = TreeDataNode & {
  access: AccessRow;
  children?: MenuTreeDataNode[];
};

function isMasterActive(value: AccessRow["masterIsActive"]): boolean {
  return value === true;
}

function matchesSearch(row: AccessRow, search: string): boolean {
  if (!search) {
    return true;
  }
  const name = row.kind === "tab" ? (row.tabName ?? "") : (row.menuName ?? "");
  const extra = row.kind === "tab" ? `${row.menuId} ${row.tabId}` : String(row.menuId);
  return `${name} ${extra}`.toLowerCase().includes(search);
}

function filterAccessTree(nodes: AccessNode[], search: string): AccessNode[] {
  if (!search) {
    return nodes;
  }
  const kept: AccessNode[] = [];
  for (const node of nodes) {
    const children = filterAccessTree(node.children, search);
    if (matchesSearch(node, search) || children.length > 0) {
      kept.push({ ...node, children });
    }
  }
  return kept;
}

function toTreeData(nodes: AccessNode[]): MenuTreeDataNode[] {
  return nodes.map((node) => ({
    key: node.key,
    title:
      node.kind === "tab"
        ? (node.tabName ?? `(tab ${node.tabId})`)
        : (node.menuName ?? `(${node.menuId})`),
    access: node,
    children: node.children.length > 0 ? toTreeData(node.children) : undefined,
  }));
}

function highlightName(name: string, search: string): React.ReactNode {
  if (!search) {
    return name;
  }
  const index = name.toLowerCase().indexOf(search);
  if (index < 0) {
    return name;
  }
  return (
    <>
      {name.slice(0, index)}
      <span className="text-orange-500">{name.slice(index, index + search.length)}</span>
      {name.slice(index + search.length)}
    </>
  );
}

function checkedKeyList(value: Parameters<NonNullable<TreeProps["onCheck"]>>[0]): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return value.checked.map(String);
}

export function MenuAccessTree({
  employerId,
  employmentNumber,
  tree,
  writesEnabled,
  defaultExpandAll = true,
}: {
  employerId: number;
  employmentNumber: string;
  tree: AccessNode[];
  writesEnabled: boolean;
  defaultExpandAll?: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim().toLowerCase(), SEARCH_DEBOUNCE_MS);
  const [mode, setMode] = useState<"GRANT" | "REVOKE">("GRANT");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [tabRightsDet, setTabRightsDet] = useState("");

  const rowsByKey = useMemo(() => {
    const map = new Map<string, AccessRow>();
    const walk = (nodes: AccessNode[]): void => {
      for (const node of nodes) {
        map.set(node.key, node);
        walk(node.children);
      }
    };
    walk(tree);
    return map;
  }, [tree]);

  const filteredTree = useMemo(() => filterAccessTree(tree, search), [tree, search]);
  const treeData = useMemo(() => toTreeData(filteredTree), [filteredTree]);
  const allExpandableKeys = useMemo(() => collectExpandableMenuKeys(tree), [tree]);
  const filteredExpandableKeys = useMemo(
    () => collectExpandableMenuKeys(filteredTree),
    [filteredTree],
  );
  const restExpandedKeys = defaultExpandAll ? allExpandableKeys : EMPTY_KEYS;
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(restExpandedKeys);
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  useEffect(() => {
    setExpandedKeys(search ? filteredExpandableKeys : restExpandedKeys);
    setAutoExpandParent(true);
  }, [search, filteredExpandableKeys, restExpandedKeys]);

  const { assignedCount, roleCount, userCount } = useMemo(() => {
    let assigned = 0;
    let role = 0;
    let user = 0;
    for (const row of rowsByKey.values()) {
      if (row.roleGrant === "Y") {
        role += 1;
      }
      if (row.userGrant === "Y") {
        user += 1;
      }
      if (row.roleGrant === "Y" || row.userGrant === "Y") {
        assigned += 1;
      }
    }
    return { assignedCount: assigned, roleCount: role, userCount: user };
  }, [rowsByKey]);

  function selectedAccess(): {
    menuIds: number[];
    tabRights: Array<{ menuId: number; tabId: number; isEditable: "Y" | "N" }>;
  } {
    const menuIds: number[] = [];
    const tabRights: Array<{ menuId: number; tabId: number; isEditable: "Y" | "N" }> = [];
    for (const key of selectedKeys) {
      const parsed = parseAccessKey(key);
      if (!parsed) {
        continue;
      }
      if (parsed.kind === "menu") {
        menuIds.push(parsed.menuId);
      } else {
        tabRights.push({
          menuId: parsed.menuId,
          tabId: parsed.tabId,
          isEditable: "Y",
        });
      }
    }
    if (tabRightsDet.trim()) {
      for (const token of tabRightsDet.split(",")) {
        const [menuId, tabId, isEditable] = token.split("~");
        tabRights.push({
          menuId: Number(menuId),
          tabId: Number(tabId),
          isEditable: isEditable === "N" ? "N" : "Y",
        });
      }
    }
    return {
      menuIds: [...new Set(menuIds)].sort((left, right) => left - right),
      tabRights,
    };
  }

  const onCheck: TreeProps["onCheck"] = useCallback(
    (checked) => {
      setSelectedKeys(checkedKeyList(checked).filter((key) => rowsByKey.has(key)));
    },
    [rowsByKey],
  );

  const titleRender = useCallback(
    (node: TreeDataNode) => {
      const access =
        (node as MenuTreeDataNode).access ?? rowsByKey.get(String(node.key));
      if (!access) {
        return String(node.key);
      }
      const name =
        access.kind === "tab"
          ? (access.tabName ?? `(tab ${access.tabId})`)
          : (access.menuName ?? `(${access.menuId})`);
      const idLabel =
        access.kind === "tab" ? `${access.menuId}/${access.tabId}` : String(access.menuId);
      return (
        <Space size={6} wrap>
          <span>{highlightName(name, search)}</span>
          <Typography.Text type="secondary">{idLabel}</Typography.Text>
          {access.kind === "tab" ? <Tag>Tab</Tag> : null}
          {access.roleGrant === "Y" ? <Tag color="blue">Role</Tag> : null}
          {access.userGrant === "Y" ? <Tag color="green">User</Tag> : null}
          {!isMasterActive(access.masterIsActive) ? (
            <Tag color="red">Inactive</Tag>
          ) : null}
          {access.wouldShow === "N" ? (
            <Tag color="orange" title={access.likelyCause}>
              Hidden
            </Tag>
          ) : null}
        </Space>
      );
    },
    [rowsByKey, search],
  );

  const selection = selectedAccess();

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      <Space wrap size="small">
        <Tag color="blue">Role {roleCount}</Tag>
        <Tag color="green">User extra {userCount}</Tag>
        <Tag>Assigned {assignedCount}</Tag>
        <Typography.Text type="secondary">
          Check a parent to select every nested item, including tabs. Grant still
          includes parents of a checked child so the left menu can show.
        </Typography.Text>
      </Space>
      <Space wrap>
        <Input.Search
          allowClear
          className="min-w-80"
          placeholder="Search menu, tab, or id"
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
          }}
        />
        <Button
          onClick={() => {
            setExpandedKeys(search ? filteredExpandableKeys : allExpandableKeys);
            setAutoExpandParent(true);
          }}
        >
          Expand all
        </Button>
        <Button
          onClick={() => {
            setExpandedKeys([]);
            setAutoExpandParent(false);
          }}
        >
          Collapse all
        </Button>
        <Button
          onClick={() => {
            setSelectedKeys(
              [...rowsByKey.values()]
                .filter((row) => row.userGrant === "Y")
                .map((row) => row.key),
            );
          }}
        >
          Select user extras
        </Button>
        <Button
          onClick={() => {
            setSelectedKeys([]);
          }}
        >
          Clear
        </Button>
      </Space>
      <div className="rounded border border-slate-200 p-2">
        <Tree
          blockNode
          checkable
          autoExpandParent={autoExpandParent}
          checkedKeys={selectedKeys}
          expandedKeys={expandedKeys}
          height={TREE_VIEWPORT_HEIGHT}
          selectable={false}
          showLine
          treeData={treeData}
          titleRender={titleRender}
          virtual
          onCheck={onCheck}
          onExpand={(keys) => {
            setExpandedKeys(keys);
            setAutoExpandParent(false);
          }}
        />
      </div>
      <Form layout="vertical">
        <Space wrap>
          <Select
            className="w-32"
            disabled={!writesEnabled}
            value={mode}
            options={[
              { label: "GRANT", value: "GRANT" },
              { label: "REVOKE", value: "REVOKE" },
            ]}
            onChange={setMode}
          />
          <Typography.Text type="secondary">
            {selection.menuIds.length} menus, {selection.tabRights.length} tabs
          </Typography.Text>
          <ConfirmWriteModal
            buttonLabel={`${mode === "GRANT" ? "Grant" : "Revoke"} access`}
            disabled={
              !writesEnabled ||
              (selection.menuIds.length === 0 && selection.tabRights.length === 0)
            }
            disabledReason={
              writesEnabled ? "Select at least one menu or tab." : "Writes are disabled."
            }
            title={`${mode} user pages and tabs`}
            previewAction={() =>
              previewGrantRevokeUserPages({
                employerId,
                employmentNumber,
                mode,
                menuIds: selection.menuIds,
                tabRights: selection.tabRights,
              })
            }
            commitAction={commitGrantRevokeUserPages}
            onDone={() => {
              setSelectedKeys([]);
              router.refresh();
            }}
          />
        </Space>
        {mode === "GRANT" ? (
          <Form.Item
            className="mt-3"
            extra="Optional extra GRANT tokens: MenuId~TabId~Y/N, comma-separated. TabId 0 stores NULL."
          >
            <Input
              disabled={!writesEnabled}
              placeholder="120~45~Y,120~0~N"
              value={tabRightsDet}
              onChange={(event) => {
                setTabRightsDet(event.target.value);
              }}
            />
          </Form.Item>
        ) : null}
      </Form>
    </Space>
  );
}
