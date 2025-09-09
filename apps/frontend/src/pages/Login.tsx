import { useEffect, useState } from "react";
import { Button, Card, Form, Input, App as AntApp } from "antd";
import { isDev } from "../lib/auth.ts";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore.ts";

export default function Login() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const storeLogin = useAuthStore((s) => s.login);
  const { message } = AntApp.useApp();

  useEffect(() => {
    // In dev, auto-login with admin/123 to skip manual login
    if (isDev()) {
      setLoading(true);
      const id = setTimeout(() => {
        storeLogin("admin", "123")
          .then(() => nav("/", { replace: true }))
          .catch(() => setLoading(false));
      }, 3000);
      return () => clearTimeout(id);
    }
  }, [nav]);

  async function onFinish(values: { email: string; password: string }) {
    try {
      setLoading(true);
      await storeLogin(values.email, values.password);
      nav("/", { replace: true });
    } catch (_e) {
      message.error("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <Card title="Sign in" style={{ width: 360 }}>
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ email: "admin", password: "123" }}
        >
          <Form.Item name="email" label="Email" rules={[{ required: true }]}>
            <Input autoFocus />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Sign in
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
