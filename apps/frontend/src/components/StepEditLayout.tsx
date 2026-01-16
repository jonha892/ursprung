import { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Button, Card, Col, Row, Space, Tag, theme, Typography } from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { DDD_STEP_META, type DddProject, DddStepKind } from "../../../../packages/shared/ddd_project.ts";

const { Title, Text } = Typography;

export interface StepEditLayoutProps {
    project: DddProject;
    stepKind: DddStepKind;
    completed: boolean;
    editCardRef: React.RefObject<HTMLDivElement | null>;
    onBack: () => void;
    onSubmit: () => void;
    isSubmitting: boolean;
    children: ReactNode;
    chat?: ReactNode;
    layout?: "split" | "stacked";
}

export function StepEditLayout({
    project,
    stepKind,
    completed,
    editCardRef,
    onBack,
    onSubmit,
    isSubmitting,
    children,
    chat,
    layout = "split",
}: StepEditLayoutProps) {
    const { token } = theme.useToken();
    const stepMeta = DDD_STEP_META[stepKind];
    const isStacked = layout === "stacked";

    return (
        <div style={{ padding: "96px 32px", maxWidth: 1400, margin: "0 auto" }}>
            <Space style={{ marginBottom: 16 }}>
                <RouterLink to="/">Projekte</RouterLink>
                {" > "}
                <RouterLink to={`/projects/${project.id}`}>{project.name}</RouterLink>
                {" > "}
                {stepMeta.label}
            </Space>

            <Row align="middle" justify="space-between" style={{ marginBottom: 12 }}>
                <Col>
                    <Title level={2} style={{ margin: 0 }}>
                        {stepMeta.label}
                    </Title>
                </Col>
                <Col>
                    <Tag color={completed ? "green" : "default"}>
                        {completed ? "Abgeschlossen" : "In Bearbeitung"}
                    </Tag>
                </Col>
            </Row>

            <Card
                size="small"
                style={{
                    marginBottom: 16,
                    backgroundColor: token.colorBgContainer,
                    borderColor: token.colorBorder,
                }}
                styles={{ body: { paddingBottom: 16 } }}
            >
                <div>
                    <Text strong style={{ color: token.colorText }}>
                        Goal:
                    </Text>
                    <br />
                    <Text style={{ color: token.colorTextSecondary }}>{stepMeta.goal}</Text>
                </div>
                <div style={{ marginTop: 12 }}>
                    <Text strong style={{ color: token.colorText }}>
                        Deliverable:
                    </Text>
                    <br />
                    <Text style={{ color: token.colorTextSecondary }}>
                        {stepMeta.deliverable}
                    </Text>
                </div>
                {stepMeta.example && (
                    <div style={{ marginTop: 12 }}>
                        <Text strong style={{ color: token.colorText }}>
                            Example:
                        </Text>
                        <br />
                        <Text style={{ color: token.colorTextSecondary }}>
                            {stepMeta.example}
                        </Text>
                    </div>
                )}
            </Card>

            {isStacked
                ? (
                    <>
                        <Card
                            ref={editCardRef}
                            styles={{
                                body: {
                                    padding: 0,
                                    display: "flex",
                                    flexDirection: "column",
                                },
                            }}
                        >
                            <div
                                style={{
                                    flex: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                    padding: 16,
                                }}
                            >
                                {children}
                            </div>
                        </Card>
                        <div
                            style={{
                                marginTop: 24,
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 24,
                                alignItems: "stretch",
                            }}
                        >
                            {chat && <div style={{ flex: 1, minWidth: 320 }}>{chat}</div>}
                            <Card
                                style={{ minWidth: 260, alignSelf: "stretch", flexShrink: 0 }}
                                styles={{
                                    body: {
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "center",
                                        height: "100%",
                                    },
                                }}
                            >
                                <Space>
                                    <Button
                                        type="primary"
                                        htmlType="button"
                                        onClick={onSubmit}
                                        loading={isSubmitting}
                                        icon={<SaveOutlined />}
                                    >
                                        Speichern
                                    </Button>
                                    <Button onClick={onBack} icon={<ArrowLeftOutlined />}>
                                        Zurück
                                    </Button>
                                </Space>
                            </Card>
                        </div>
                    </>
                )
                : (
                    <Row gutter={[24, 24]}>
                        <Col xs={24} lg={16}>
                            <Card
                                ref={editCardRef}
                                styles={{
                                    body: {
                                        padding: 0,
                                        height: "100%",
                                        display: "flex",
                                        flexDirection: "column",
                                    },
                                }}
                            >
                                <div
                                    style={{
                                        flex: 1,
                                        display: "flex",
                                        flexDirection: "column",
                                        padding: 16,
                                        paddingBottom: 0,
                                    }}
                                >
                                    {children}
                                    <div style={{ padding: 16, paddingTop: 8 }}>
                                        <Space>
                                            <Button
                                                type="primary"
                                                htmlType="button"
                                                onClick={onSubmit}
                                                loading={isSubmitting}
                                                icon={<SaveOutlined />}
                                            >
                                                Speichern
                                            </Button>
                                            <Button onClick={onBack} icon={<ArrowLeftOutlined />}>
                                                Zurück
                                            </Button>
                                        </Space>
                                    </div>
                                </div>
                            </Card>
                        </Col>
                        {chat && (
                            <Col xs={24} lg={8}>
                                {chat}
                            </Col>
                        )}
                    </Row>
                )}
        </div>
    );
}
