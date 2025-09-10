import { FC } from "react";
import { Layout, Switch, Typography, Flex, theme } from "antd";
import { useAuthStore } from "../stores/authStore.ts";

const { Header } = Layout;
const { Text } = Typography;

export interface GlobalHeaderProps {
  isDark: boolean;
  onToggle: () => void;
}

export const GlobalHeader: FC<GlobalHeaderProps> = ({ isDark, onToggle }) => {
  const user = useAuthStore((s) => s.user);
  const { token } = theme.useToken();
  return (
    <Header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        width: "100%",
        display: "flex",
        alignItems: "center",
        padding: "0 32px",
        background: token.colorBgContainer,
        boxShadow: `0 2px 4px ${token.colorSplit}`,
      }}
    >
      <Flex style={{ flex: 1 }} align="center" gap={32}>
        <Text style={{ fontSize: 18, fontWeight: 600 }}>Ursprung</Text>
      </Flex>
      <Flex align="center" gap={24}>
        <Flex align="center" gap={8}>
          <Switch
            checked={isDark}
            onChange={onToggle}
            checkedChildren="🌙"
            unCheckedChildren="☀️"
          />
        </Flex>
      </Flex>
    </Header>
  );
};
