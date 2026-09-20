import { useState } from "react";
import { Button, Input, Space, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { normalizeCustomHostInput } from "@/shared/allowed-hosts";

export interface HostAllowlistProps {
  hosts: string[];
  onChange: (hosts: string[]) => Promise<void>;
}

export function HostAllowlist({ hosts, onChange }: HostAllowlistProps) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const normalized = normalizeCustomHostInput(draft);
    if (!normalized) {
      message.warning("Enter a hostname like uat.example.com");
      return;
    }
    if (hosts.includes(normalized)) {
      message.info("Host already allowed");
      setDraft("");
      return;
    }
    setSaving(true);
    try {
      await onChange([...hosts, normalized]);
      setDraft("");
      message.success(`Allowed ${normalized}`);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not save host",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (host: string) => {
    setSaving(true);
    try {
      await onChange(hosts.filter((entry) => entry !== host));
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Could not remove host",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="autofill:flex autofill:flex-col autofill:gap-2">
      <Typography.Text strong>Allowed hosts</Typography.Text>
      <Typography.Text type="secondary" className="autofill:text-xs">
        Localhost and *.thedigitalgroup.com are always allowed. Add customer
        UAT hostnames here (Chrome will prompt for permission).
      </Typography.Text>
      <Space.Compact className="autofill:w-full">
        <Input
          size="small"
          placeholder="uat.customer.com"
          value={draft}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onPressEnter={() => void handleAdd()}
        />
        <Button
          size="small"
          type="primary"
          icon={<PlusOutlined />}
          loading={saving}
          onClick={() => void handleAdd()}
        >
          Add
        </Button>
      </Space.Compact>
      <div className="autofill:flex autofill:flex-wrap autofill:gap-1">
        {hosts.length === 0 ? (
          <Typography.Text type="secondary" className="autofill:text-xs">
            No custom hosts yet.
          </Typography.Text>
        ) : (
          hosts.map((host) => (
            <Tag
              key={host}
              closable
              onClose={(e) => {
                e.preventDefault();
                void handleRemove(host);
              }}
            >
              {host}
            </Tag>
          ))
        )}
      </div>
    </div>
  );
}
