import { useEffect, useState } from "react";
import { Button, Card, Form, Input, App as AntApp } from "antd";
import { isDev } from "../lib/auth.ts";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore.ts";
import { userService } from "../lib/user_service.ts";

export default function Login() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const { message } = AntApp.useApp();

  useEffect(() => {
    if (isDev()) {
      setLoading(true);
      const id = setTimeout(async () => {
        try {
          const res = await userService.login("admin", "123");
          setAuth({
            user: res.user,
            token: res.token,
            refreshToken: res.refreshToken,
          });
          nav("/", { replace: true });
        } catch (_) {
          setLoading(false);
        }
      }, 1500);
      return () => clearTimeout(id);
    }
  }, [nav, setAuth]);

  async function onFinish(values: { email: string; password: string }) {
    try {
      setLoading(true);
      const res = await userService.login(values.email, values.password);
      setAuth({
        user: res.user,
        token: res.token,
        refreshToken: res.refreshToken,
      });
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
