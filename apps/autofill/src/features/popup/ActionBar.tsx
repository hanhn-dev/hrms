import { Button, Space, Tooltip } from "antd";
import {
  AimOutlined,
  FormOutlined,
  FontSizeOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

export interface ActionBarProps {
  scanning: boolean;
  picking: boolean;
  filling: boolean;
  typing: boolean;
  hasSelection: boolean;
  onScanPage: () => void;
  onPickScan: () => void;
  /** Inspector pick a section, then scan + fill it. */
  onPickFill: () => void;
  /** Fill only the checked fields from the last scan (no pick). */
  onFillSelected: () => void;
  onAutoTypeSelected: () => void;
}

export function ActionBar({
  scanning,
  picking,
  filling,
  typing,
  hasSelection,
  onScanPage,
  onPickScan,
  onPickFill,
  onFillSelected,
  onAutoTypeSelected,
}: ActionBarProps) {
  const busy = scanning || picking || filling || typing;

  return (
    <Space wrap className="autofill:w-full">
      <Tooltip title="Click a section on the page, then fields are collected from that area">
        <Button
          type="primary"
          icon={<AimOutlined />}
          onClick={onPickScan}
          loading={picking}
          disabled={busy && !picking}
        >
          Pick & scan
        </Button>
      </Tooltip>
      <Tooltip title="Scan the whole page (richest frame)">
        <Button
          icon={<ReloadOutlined />}
          onClick={onScanPage}
          loading={scanning}
          disabled={busy && !scanning}
        >
          Scan page
        </Button>
      </Tooltip>
      {hasSelection ? (
        <Tooltip title="Fill only the checked fields under the last scanned section">
          <Button
            icon={<FormOutlined />}
            onClick={onFillSelected}
            loading={filling}
            disabled={busy && !filling}
          >
            Fill selected
          </Button>
        </Tooltip>
      ) : (
        <Tooltip title="Click a form section, then fill that area with random data">
          <Button
            icon={<FormOutlined />}
            onClick={onPickFill}
            loading={picking}
            disabled={busy && !picking}
          >
            Pick & fill
          </Button>
        </Tooltip>
      )}
      <Button
        icon={<FontSizeOutlined />}
        onClick={onAutoTypeSelected}
        loading={typing}
        disabled={!hasSelection || (busy && !typing)}
      >
        Auto-type selected
      </Button>
    </Space>
  );
}
