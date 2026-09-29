"use client";

import { Button, Form, Input } from "antd";
import { useRouter } from "next/navigation";

export function EmployeeSearchForm({
  employerId,
  initialSearch,
}: {
  employerId: number;
  initialSearch: string;
}): React.JSX.Element {
  const router = useRouter();
  return (
    <Form
      className="mb-4 flex gap-2"
      layout="inline"
      initialValues={{ search: initialSearch }}
      onFinish={(values: { search: string }) => {
        const params = new URLSearchParams();
        if (values.search?.trim()) {
          params.set("q", values.search.trim());
        }
        const query = params.toString();
        router.push(
          `/employers/${employerId}/employees${query ? `?${query}` : ""}`,
        );
      }}
    >
      <Form.Item className="!mb-0 flex-1" name="search">
        <Input
          allowClear
          placeholder="Employment number, name, or email"
        />
      </Form.Item>
      <Button htmlType="submit" type="primary">
        Search
      </Button>
    </Form>
  );
}
