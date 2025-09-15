import { FC, useState } from "react";
import { Button, Col, Form, Input, message, Modal, Popconfirm, Row, Select, Space, Tag, theme, Typography } from "antd";
import { DeleteOutlined, KeyOutlined, PlusOutlined } from "@ant-design/icons";
import { useAuthStore } from "../stores/authStore.ts";
import { type ApiProvider, useApiKeyStore } from "../stores/apiKeyStore.ts";

const { Title, Text } = Typography;
const { Option } = Select;

interface ApiKeyFormValues {
    provider: ApiProvider;
    key: string;
    name?: string;
}

const PROVIDER_LABELS = {
    openai: "OpenAI",
    // anthropic: "Anthropic",
    // gemini: "Google Gemini",
} as const;

const PROVIDER_COLORS = {
    openai: "green",
    // anthropic: "orange",
    // gemini: "blue",
} as const;
export const Profile: FC = () => {
    const user = useAuthStore((s) => s.user);
    const { apiKeys, addApiKey, removeApiKey, hasApiKey, selectedApiKey, setSelectedApiKey } = useApiKeyStore();
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm<ApiKeyFormValues>();
    const { token } = theme.useToken();

    const handleAddApiKey = (values: ApiKeyFormValues) => {
        try {
            addApiKey(values.provider, values.key, values.name);
            message.success(`${PROVIDER_LABELS[values.provider]} API Key hinzugefügt`);
            setModalOpen(false);
            form.resetFields();
        } catch (_error) {
            message.error("Fehler beim Hinzufügen des API Keys");
        }
    };

    const handleRemoveApiKey = (provider: ApiProvider) => {
        removeApiKey(provider);
        message.success(`${PROVIDER_LABELS[provider]} API Key entfernt`);
    };

    const maskApiKey = (key: string) => {
        if (key.length <= 8) return key;
        return `${key.slice(0, 4)}...${key.slice(-4)}`;
    };

    return (
        <>
            {/* Header Section */}
            <Row
                align="middle"
                justify="space-between"
                style={{
                    marginBottom: 24,
                    paddingBottom: 16,
                    borderBottom: `2px solid ${token.colorBorder || "#e5e5e5"}`,
                }}
            >
                <Col>
                    <Title level={2} style={{ margin: 0 }}>
                        Willkommen, {user?.email}!
                    </Title>
                    <Text type="secondary" style={{ marginTop: 4 }}>
                        Verwalte deine API-Schlüssel und Einstellungen
                    </Text>
                </Col>
                <Col>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setModalOpen(true)}
                    >
                        API Key hinzufügen
                    </Button>
                </Col>
            </Row>

            {/* API Keys Grid */}
            <Row gutter={[24, 24]}>
                {apiKeys.length === 0
                    ? (
                        <Col span={24}>
                            <div
                                style={{
                                    textAlign: "center",
                                    padding: "48px 24px",
                                    color: token.colorTextSecondary,
                                }}
                            >
                                <Text type="secondary">Keine API-Schlüssel konfiguriert</Text>
                            </div>
                        </Col>
                    )
                    : (
                        apiKeys.map((apiKey) => (
                            <Col xs={24} sm={12} lg={8} key={apiKey.provider}>
                                <div
                                    style={{
                                        padding: "16px",
                                        border: `1px solid ${selectedApiKey === apiKey.provider ? token.colorPrimary : token.colorBorder}`,
                                        borderRadius: 8,
                                        background: token.colorBgContainer,
                                        height: "100%",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "space-between",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                    }}
                                    onClick={() => setSelectedApiKey(apiKey.provider)}
                                >
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                            <KeyOutlined style={{ color: token.colorPrimary }} />
                                            <Tag color={PROVIDER_COLORS[apiKey.provider]}>
                                                {PROVIDER_LABELS[apiKey.provider]}
                                            </Tag>
                                            {selectedApiKey === apiKey.provider && <Tag color="blue">Ausgewählt</Tag>}
                                        </div>
                                        <Text code style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
                                            {maskApiKey(apiKey.key)}
                                        </Text>
                                        {apiKey.name && (
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {apiKey.name}
                                            </Text>
                                        )}
                                    </div>
                                    <div style={{ marginTop: 12, textAlign: "right" }}>
                                        <Popconfirm
                                            title={`${PROVIDER_LABELS[apiKey.provider]} API Key löschen?`}
                                            description="Diese Aktion kann nicht rückgängig gemacht werden."
                                            onConfirm={(e) => {
                                                e?.stopPropagation();
                                                handleRemoveApiKey(apiKey.provider);
                                            }}
                                            okText="Löschen"
                                            cancelText="Abbrechen"
                                        >
                                            <Button
                                                type="text"
                                                danger
                                                icon={<DeleteOutlined />}
                                                size="small"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Löschen
                                            </Button>
                                        </Popconfirm>
                                    </div>
                                </div>
                            </Col>
                        ))
                    )}
            </Row>

            {/* Add API Key Modal */}
            <Modal
                title="API Key hinzufügen"
                open={modalOpen}
                onCancel={() => {
                    setModalOpen(false);
                    form.resetFields();
                }}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleAddApiKey}
                    style={{ marginTop: 16 }}
                >
                    <Form.Item
                        name="provider"
                        label="Anbieter"
                        rules={[{ required: true, message: "Bitte wähle einen Anbieter aus" }]}
                    >
                        <Select placeholder="Anbieter auswählen">
                            {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
                                <Option
                                    key={key}
                                    value={key}
                                    disabled={hasApiKey(key as ApiProvider)}
                                >
                                    <Space>
                                        <Tag color={PROVIDER_COLORS[key as ApiProvider]} style={{ margin: 0 }}>
                                            {label}
                                        </Tag>
                                        {hasApiKey(key as ApiProvider) && <Text type="secondary">(bereits konfiguriert)</Text>}
                                    </Space>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="key"
                        label="API Key"
                        rules={[
                            { required: true, message: "Bitte gib den API Key ein" },
                            { min: 10, message: "API Key muss mindestens 10 Zeichen lang sein" },
                        ]}
                    >
                        <Input.Password
                            placeholder="sk-..."
                            autoComplete="off"
                        />
                    </Form.Item>

                    <Form.Item
                        name="name"
                        label="Name (optional)"
                        extra="Ein optionaler Name zur besseren Identifikation"
                    >
                        <Input placeholder="z.B. Mein OpenAI Key" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                            <Button onClick={() => setModalOpen(false)}>
                                Abbrechen
                            </Button>
                            <Button type="primary" htmlType="submit">
                                Hinzufügen
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};
