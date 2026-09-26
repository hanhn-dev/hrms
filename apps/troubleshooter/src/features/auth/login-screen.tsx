"use client";

import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginScreen({
  configured,
}: {
  configured: boolean;
}): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-md">
        <Typography.Title level={3}>HRMS Troubleshooter</Typography.Title>
        <Typography.Paragraph type="secondary">
          Local root admin. This operator can select any employer.
        </Typography.Paragraph>
        {!configured ? (
          <Alert
            showIcon
            type="error"
            title="Auth is not configured"
            description="Set AUTH_SECRET, TROUBLESHOOTER_ADMIN_USERNAME, and TROUBLESHOOTER_ADMIN_PASSWORD."
          />
        ) : (
          <Form
            layout="vertical"
            onFinish={(values: { username: string; password: string }) => {
              setPending(true);
              setError(null);
              void signIn("credentials", {
                username: values.username,
                password: values.password,
                redirect: false,
              }).then((result) => {
                setPending(false);
                if (!result || result.error) {
                  setError("Invalid username or password.");
                  return;
                }
                window.location.assign("/");
              });
            }}
          >
            {error ? (
              <Alert className="mb-4" showIcon type="error" title={error} />
            ) : null}
            <Form.Item
              label="Username"
              name="username"
              rules={[{ required: true }]}
            >
              <Input autoComplete="username" />
            </Form.Item>
            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true }]}
            >
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Button block htmlType="submit" loading={pending} type="primary">
              Sign in
            </Button>
          </Form>
        )}
      </Card>
    </div>
  );
}
