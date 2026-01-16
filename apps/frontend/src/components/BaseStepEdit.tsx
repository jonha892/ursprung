import { ReactNode } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Breadcrumb, Button, Card, Col, Form, Row, Space, Switch, Tag, theme, Typography, Upload } from "antd";
import { ArrowLeftOutlined, SaveOutlined, UploadOutlined } from "@ant-design/icons";
import { DDD_STEP_META, DDD_STEPS, type DddProject, DddStepKind } from "../../../../packages/shared/ddd_project.ts";
import { useDebouncedFormSave } from "../lib/useDebouncedFormSave.ts";

const { Title, Paragraph, Text } = Typography;

export interface BaseStepFormValues {
    completed: boolean;
}

export interface BaseStepEditProps {
    project: DddProject;
    stepKind: DddStepKind;
    onSave: (values: BaseStepFormValues) => Promise<void>;
    loading?: boolean;
    children?: ReactNode;
}

export function BaseStepEdit({
    project,
    stepKind,
    onSave,
    loading = false,
    children,
}: BaseStepEditProps) {
    const nav = useNavigate();
    const [form] = Form.useForm<BaseStepFormValues>();
    const { token } = theme.useToken();

    const stepMeta = DDD_STEP_META[stepKind];
    const stepContent = project.content[stepKind];

    // Initialize form with current step content
    const initialValues: BaseStepFormValues = {
        completed: stepContent.completed,
    };

    const handleBack = () => {
        nav(`/projects/${project.id}`);
    };

    const { onValuesChange, triggerSaveNow, isSaving } = useDebouncedFormSave<BaseStepFormValues>(form, {
        delay: 5000,
        onSave: onSave,
    });

    return (
        <div style={{ padding: "96px 32px", maxWidth: 1400, margin: "0 auto" }}>
            {/* Breadcrumbs */}
            <Breadcrumb
                style={{ marginBottom: 16 }}
                items={[
                    {
                        title: <RouterLink to="/">Projekte</RouterLink>,
                    },
                    {
                        title: <RouterLink to={`/projects/${project.id}`}>{project.name}</RouterLink>,
                    },
                    {
                        title: stepMeta.label,
                    },
                ]}
            />

            {/* Header */}
            <Row align="middle" justify="space-between" style={{ marginBottom: 24 }}>
                <Col>
                    <Space>
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={handleBack}
                            type="text"
                        >
                            Zurück
                        </Button>
                    </Space>
                </Col>
                <Col>
                    <Tag color={stepContent.completed ? "green" : "default"}>
                        {stepContent.completed ? "Abgeschlossen" : "In Bearbeitung"}
                    </Tag>
                </Col>
            </Row>

            <Title level={2} style={{ marginBottom: 8 }}>
                {stepMeta.label}
            </Title>

            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                {stepMeta.goal}
            </Paragraph>

            <Card style={{ marginBottom: 24, backgroundColor: token.colorBgContainer }}>
                <div style={{ marginBottom: 12 }}>
                    <Text strong style={{ color: token.colorText }}>Zu erstellende Deliverables:</Text>
                    <br />
                    <Text style={{ color: token.colorTextSecondary }}>{stepMeta.deliverable}</Text>
                </div>
                {stepMeta.example && (
                    <div>
                        <Text strong style={{ color: token.colorText }}>Beispiel:</Text>
                        <br />
                        <Text style={{ whiteSpace: "pre-line", fontStyle: "italic", color: token.colorTextSecondary }}>
                            {stepMeta.example}
                        </Text>
                    </div>
                )}
            </Card>

            {/* Main Content */}
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                    <Card title="Bearbeitung" style={{ marginBottom: 24, minHeight: 400 }}>
                        <Form
                            form={form}
                            layout="vertical"
                            onValuesChange={onValuesChange}
                            onFinish={() => triggerSaveNow()}
                            initialValues={initialValues}
                        >
                            {/* Custom fields from children */}
                            {children}

                            <Form.Item name="completed" valuePropName="checked">
                                <Switch
                                    checkedChildren="Abgeschlossen"
                                    unCheckedChildren="In Bearbeitung"
                                    onChange={async (checked) => {
                                        form.setFieldValue("completed", checked);
                                        await triggerSaveNow();
                                    }}
                                />
                            </Form.Item>

                            <Form.Item>
                                <Space>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={loading || isSaving}
                                        icon={<SaveOutlined />}
                                    >
                                        Speichern
                                    </Button>
                                    <Button onClick={handleBack}>
                                        Abbrechen
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Form>
                    </Card>

                    {/* File Attachments */}
                    <Card title="Anhänge">
                        <Upload.Dragger
                            multiple
                            action="/api/upload"
                            showUploadList={{ showRemoveIcon: true }}
                            disabled
                        >
                            <p style={{ fontSize: 16, marginBottom: 8 }}>
                                <UploadOutlined style={{ marginRight: 8 }} />
                                Dateien hochladen
                            </p>
                            <p style={{ color: token.colorTextSecondary, margin: 0 }}>
                                Ziehen Sie Dateien hierher oder klicken Sie zum Auswählen
                            </p>
                            <p
                                style={{
                                    color: token.colorTextSecondary,
                                    fontSize: 12,
                                    margin: "8px 0 0 0",
                                }}
                            >
                                (Feature noch nicht implementiert)
                            </p>
                        </Upload.Dragger>
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    {/* Help/Example Card */}
                    <Card title="Hilfe & Beispiel" style={{ marginBottom: 24 }}>
                        <div style={{ marginBottom: 16 }}>
                            <Text strong>Ziel:</Text>
                            <Paragraph style={{ marginBottom: 16, marginTop: 8 }}>
                                {stepMeta.goal}
                            </Paragraph>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <Text strong>Zu erstellen:</Text>
                            <Paragraph style={{ marginBottom: 16, marginTop: 8 }}>
                                {stepMeta.deliverable}
                            </Paragraph>
                        </div>

                        {stepMeta.example && (
                            <div>
                                <Text strong>Beispiel:</Text>
                                <div
                                    style={{
                                        marginTop: 8,
                                        padding: 12,
                                        backgroundColor: token.colorFillTertiary,
                                        borderRadius: token.borderRadius,
                                        fontSize: 12,
                                        whiteSpace: "pre-line",
                                    }}
                                >
                                    {stepMeta.example}
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Step Progress */}
                    <Card title="Schritt-Navigation">
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {DDD_STEPS.map((s, index) => {
                                const meta = DDD_STEP_META[s];
                                const content = project.content[s];
                                const isDone = content.completed;
                                const isCurrent = s === stepKind;

                                return (
                                    <div
                                        key={s}
                                        style={{
                                            padding: "8px 12px",
                                            borderRadius: token.borderRadius,
                                            backgroundColor: isCurrent ? token.colorPrimaryBg : "transparent",
                                            border: isCurrent ? `1px solid ${token.colorPrimary}` : "1px solid transparent",
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                        }}
                                        onClick={() => nav(`/projects/${project.id}/steps/${s}`)}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 12,
                                                    fontWeight: isCurrent ? 600 : 400,
                                                }}
                                            >
                                                {index + 1}. {meta.label}
                                            </Text>
                                            <Tag
                                                color={isDone ? "green" : "default"}
                                            >
                                                {isDone ? "✓" : "○"}
                                            </Tag>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
