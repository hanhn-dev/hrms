"use client";

import { DatabaseOutlined } from "@ant-design/icons";
import { Button } from "antd";
import Link from "next/link";

export function DbsEntryButton(): React.JSX.Element {
  return (
    <Link href="/dbs">
      <Button icon={<DatabaseOutlined />}>Data Builder Studio</Button>
    </Link>
  );
}
