"use client";

import { searchText } from "@hrms/db/page";
import { Button, Form, Input } from "antd";
import { useRouter } from "next/navigation";
import { listHref } from "@/shared/list-query";

export function BusinessUnitSearchForm({
  employerId,
  employmentNumber,
  initialSearch,
  pageSize,
}: {
  employerId: number;
  employmentNumber: string;
  initialSearch: string;
  pageSize: number;
}): React.JSX.Element {
  const router = useRouter();
  return (
    <Form
      className="mb-4 flex gap-2"
      layout="inline"
      initialValues={{ search: initialSearch }}
      onFinish={(values: { search: string }) => {
        const base = `/employers/${employerId}/employees/${encodeURIComponent(employmentNumber)}/business-unit`;
        router.push(listHref(base, { page: 1, pageSize, q: searchText(values.search) }));
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
