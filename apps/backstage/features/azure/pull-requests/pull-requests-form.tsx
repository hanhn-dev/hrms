"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";
import { useState } from "react";

export function PullRequestsForm({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (ids: string) => void;
}): React.JSX.Element {
  const [ids, setIds] = useState("");
  const trimmed = ids.trim();

  return (
    <div className="mb-4 flex flex-wrap items-start gap-2">
      <Input
        allowClear
        className="min-w-[320px] flex-1"
        placeholder="Work item, bug, or task IDs — e.g. 12345,45678,8910"
        value={ids}
        onChange={(event) => setIds(event.target.value)}
        onPressEnter={() => {
          if (trimmed) {
            onSubmit(trimmed);
          }
        }}
      />
      <Button
        disabled={trimmed.length === 0}
        icon={<SearchOutlined />}
        loading={loading}
        type="primary"
        onClick={() => onSubmit(trimmed)}
      >
        Find pull requests
      </Button>
    </div>
  );
}
