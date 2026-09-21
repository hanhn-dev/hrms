import { Button, Space, Tooltip } from "antd";
import {
  AimOutlined,
  FormOutlined,
  FontSizeOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { shortcutLabelFor } from "@/features/shortcuts";

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
  /** Inspector pick a section, then keystroke-type each field. */
  onPickAutoType: () => void;
  /** Keystroke-type all checked fields in order (no pick). */
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
  onPickAutoType,
  onAutoTypeSelected,
}: ActionBarProps) {
  const busy = scanning || picking || filling || typing;

  return (
    <Space wrap className="autofill:w-full">
      <Tooltip
        title={`Click a section on the page, then fields are collected from that area (${shortcutLabelFor("pick-scan")})`}
      >
        <Button
          type="primary"
          icon={<AimOutlined />}
          onClick={onPickScan}
          loading={picking}
          disabled={busy && !picking}
          aria-keyshortcuts={shortcutLabelFor("pick-scan")}
        >
          Pick & scan
        </Button>
      </Tooltip>
      <Tooltip
        title={`Scan the whole page (richest frame) (${shortcutLabelFor("scan-page")})`}
      >
        <Button
          icon={<ReloadOutlined />}
          onClick={onScanPage}
          loading={scanning}
          disabled={busy && !scanning}
          aria-keyshortcuts={shortcutLabelFor("scan-page")}
        >
          Scan page
        </Button>
      </Tooltip>
      {hasSelection ? (
        <Tooltip
          title={`Fill only the checked fields under the last scanned section (${shortcutLabelFor("pick-fill")})`}
        >
          <Button
            icon={<FormOutlined />}
            onClick={onFillSelected}
            loading={filling}
            disabled={busy && !filling}
            aria-keyshortcuts={shortcutLabelFor("pick-fill")}
          >
            Fill selected
          </Button>
        </Tooltip>
      ) : (
        <Tooltip
          title={`Click a form section, then fill that area with random data (${shortcutLabelFor("pick-fill")})`}
        >
          <Button
            icon={<FormOutlined />}
            onClick={onPickFill}
            loading={picking}
            disabled={busy && !picking}
            aria-keyshortcuts={shortcutLabelFor("pick-fill")}
          >
            Pick & fill
          </Button>
        </Tooltip>
      )}
      {hasSelection ? (
        <Tooltip
          title={`Keystroke-type all checked fields in order (${shortcutLabelFor("auto-type")})`}
        >
          <Button
            icon={<FontSizeOutlined />}
            onClick={onAutoTypeSelected}
            loading={typing}
            disabled={busy && !typing}
            aria-keyshortcuts={shortcutLabelFor("auto-type")}
          >
            Auto-type selected
          </Button>
        </Tooltip>
      ) : (
        <Tooltip
          title={`Click a form section, then keystroke-type each field (${shortcutLabelFor("auto-type")})`}
        >
          <Button
            icon={<FontSizeOutlined />}
            onClick={onPickAutoType}
            loading={picking}
            disabled={busy && !picking}
            aria-keyshortcuts={shortcutLabelFor("auto-type")}
          >
            Pick & type
          </Button>
        </Tooltip>
      )}
    </Space>
  );
}
