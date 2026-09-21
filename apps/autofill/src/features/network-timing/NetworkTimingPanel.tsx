import { useState, type CSSProperties } from "react";
import { Button, Input, Switch, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  formatCached,
  formatSeconds,
  formatStatus,
  isSlowRequest,
  visibleNetworkRows,
  type NetworkTimingRow,
} from "./timing";

export const NETWORK_CAPTURE_EMPTY_HINT =
  "Start capture, use the page, then reopen this popup.";

export const PAGE_NETWORK_CAPTURE_EMPTY_HINT =
  "Start capture, then use the page. This panel stays open.";

export interface NetworkTimingPanelProps {
  capturing: boolean;
  busy: boolean;
  rows: NetworkTimingRow[];
  showAllTypes: boolean;
  onStart: () => void;
  onStop: () => void;
  onShowAllTypesChange: (showAllTypes: boolean) => void;
  /** Shown when nothing has been captured yet. */
  emptyHint?: string;
}

const toolbarStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 12,
  rowGap: 8,
};

const toggleGroupStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  color: "#595959",
  whiteSpace: "nowrap",
};

const statusStyle: CSSProperties = {
  fontSize: 12,
  color: "#8c8c8c",
  whiteSpace: "nowrap",
};

const panelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

export function NetworkTimingPanel({
  capturing,
  busy,
  rows,
  showAllTypes,
  onStart,
  onStop,
  onShowAllTypesChange,
  emptyHint = NETWORK_CAPTURE_EMPTY_HINT,
}: NetworkTimingPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const typeFiltered = visibleNetworkRows(rows, showAllTypes);
  const visible = visibleNetworkRows(rows, showAllTypes, searchQuery);
  const columns: ColumnsType<NetworkTimingRow> = [
    {
      title: "Seconds",
      dataIndex: "durationSeconds",
      width: 88,
      defaultSortOrder: "descend",
      sorter: (left, right) =>
        (left.durationSeconds ?? -1) - (right.durationSeconds ?? -1),
      render: (value: number | null) => formatSeconds(value),
    },
    {
      title: "Waiting",
      dataIndex: "waitingSeconds",
      width: 88,
      render: (value: number | null) => formatSeconds(value),
    },
    {
      title: "Handling",
      dataIndex: "handlingSeconds",
      width: 96,
      render: (value: number | null) => formatSeconds(value),
    },
    { title: "Method", dataIndex: "method", width: 80 },
    {
      title: "Status",
      dataIndex: "status",
      width: 88,
      render: (value: NetworkTimingRow["status"]) => formatStatus(value),
    },
    {
      title: "Cached",
      dataIndex: "cached",
      width: 72,
      render: (value: boolean) => formatCached(value),
    },
    { title: "Type", dataIndex: "resourceType", width: 80 },
    {
      title: "URL",
      dataIndex: "url",
      ellipsis: true,
      render: (url: string) => (
        <Typography.Text ellipsis={{ tooltip: url }}>{url}</Typography.Text>
      ),
    },
    {
      title: "Initiator",
      dataIndex: "initiatorLabel",
      width: 140,
      ellipsis: true,
    },
  ];

  const emptyMessage = (() => {
    if (rows.length === 0) {
      return emptyHint;
    }
    if (typeFiltered.length === 0) {
      return "No API calls yet. Turn on Show all types to include scripts, images, and CSS.";
    }
    if (visible.length === 0) {
      return "No requests match this search.";
    }
    return null;
  })();

  return (
    <div style={panelStyle} data-network-timing-panel="">
      <div style={toolbarStyle} data-network-timing-toolbar="">
        <Button
          size="small"
          type="primary"
          onClick={onStart}
          disabled={busy || capturing}
          loading={busy && !capturing}
        >
          {busy && !capturing ? "Starting…" : "Start capture"}
        </Button>
        <Button
          size="small"
          onClick={onStop}
          disabled={busy || !capturing}
          loading={busy && capturing}
        >
          {busy && capturing ? "Stopping…" : "Stop capture"}
        </Button>
        <span style={toggleGroupStyle}>
          <Switch
            size="small"
            checked={showAllTypes}
            onChange={onShowAllTypesChange}
            aria-label="Show all types"
          />
          <span>Show all types</span>
        </span>
        <span style={statusStyle}>
          {capturing ? "Capturing" : "Not capturing"}
        </span>
      </div>

      {rows.length > 0 ? (
        <Input.Search
          allowClear
          size="small"
          placeholder="Filter by URL, method, status, type, or initiator"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onSearch={setSearchQuery}
          aria-label="Filter requests"
        />
      ) : null}

      {emptyMessage ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {emptyMessage}
        </Typography.Text>
      ) : (
        <Table<NetworkTimingRow>
          size="small"
          pagination={false}
          rowKey="requestId"
          columns={columns}
          dataSource={visible}
          scroll={{ x: 980, y: 220 }}
          rowClassName={(row) =>
            isSlowRequest(row) ? "autofill-slow-request" : ""
          }
        />
      )}
    </div>
  );
}
