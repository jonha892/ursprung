import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { Breadcrumb, Button, Card, Col, Row, Spin, Tag, theme, Typography } from "antd";
import { App as AntApp } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useProjectStore } from "../stores/projectStore.ts";
import { DDD_STEP_META, DDD_STEPS } from "../../../../packages/shared/ddd_project.ts";

const { Title, Paragraph, Text } = Typography;

export default function ProjectOverview() {
    const { id } = useParams<{ id: string }>();
    const nav = useNavigate();
    const [initialLoading, setInitialLoading] = useState(false);

    // Select store methods and state
    const projects = useProjectStore((s) => s.projects);
    const currentProject = useProjectStore((s) => s.currentProject);
    const loadingProject = useProjectStore((s) => s.loadingProject);
    const getProject = useProjectStore((s) => s.getProject);
    const refreshProject = useProjectStore((s) => s.refreshProject);

    const project = currentProject?.id === id ? currentProject : projects.find((p) => p.id === id);
    const { message } = AntApp.useApp();
    const redirectedRef = useRef(false);

    // Load project if not found in store (handles deep linking)
    useEffect(() => {
        if (!project && id && !redirectedRef.current && !initialLoading) {
            setInitialLoading(true);
            getProject(id)
                .then(() => {
                    setInitialLoading(false);
                })
                .catch(() => {
                    setInitialLoading(false);
                    if (!redirectedRef.current) {
                        redirectedRef.current = true;
                        message.error("Projekt nicht gefunden");
                        nav("/", { replace: true });
                    }
                });
        }
    }, [project, id, getProject, message, nav, initialLoading]);

    // Handle refresh button
    const handleRefresh = async () => {
        if (!id) return;
        try {
            await refreshProject(id);
            message.success("Projekt aktualisiert");
        } catch {
            message.error("Fehler beim Aktualisieren");
        }
    };

    // theme token hook reserved for future styling adjustments
    theme.useToken();

    // Show loading spinner during initial load
    if (initialLoading || (!project && !redirectedRef.current)) {
        return (
            <div
                style={{
                    padding: "96px 32px",
                    maxWidth: 1400,
                    margin: "0 auto",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "50vh",
                }}
            >
                <Spin size="large" />
            </div>
        );
    }

    if (!project) return null; // redirect effect handles UX

    // Pre-compute progress metrics once per render
    const totalSteps = DDD_STEPS.length;
    const doneSteps = DDD_STEPS.reduce((acc, step) => {
        const c = project.content[step];
        return acc + (c.completed ? 1 : 0);
    }, 0);
    const allDone = doneSteps === totalSteps;

    return (
        <div style={{ padding: "96px 32px", maxWidth: 1400, margin: "0 auto" }}>
            <Breadcrumb
                style={{ marginBottom: 16 }}
                items={[
                    {
                        title: <RouterLink to="/">Projekte</RouterLink>,
                    },
                    {
                        title: project.name,
                    },
                ]}
            />
            <Row align="middle" justify="space-between" style={{ marginBottom: 24 }}>
                <Col>
                    <Title level={2} style={{ margin: 0 }}>
                        {project.name}
                    </Title>
                    <Paragraph type="secondary" style={{ marginTop: 4, maxWidth: 720 }}>
                        {project.abstract}
                    </Paragraph>
                    <Paragraph
                        type="secondary"
                        style={{
                            marginTop: 8,
                            marginBottom: 0,
                            fontSize: 12,
                            lineHeight: 1.35,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        <span>
                            <Text strong style={{ fontSize: 12 }}>
                                Angelegt:
                            </Text>{" "}
                            {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                        <span>
                            <Text strong style={{ fontSize: 12 }}>
                                Aktualisiert:
                            </Text>{" "}
                            {new Date(project.updatedAt).toLocaleDateString()}
                        </span>
                    </Paragraph>
                </Col>
                <Col>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={handleRefresh}
                            loading={loadingProject}
                            type="text"
                            title="Projekt aktualisieren"
                        >
                            Aktualisieren
                        </Button>
                        <Tag
                            color={allDone ? "green" : "processing"}
                            style={{
                                fontSize: 14,
                                padding: "4px 14px",
                                lineHeight: 1.4,
                                borderRadius: 20,
                                fontWeight: 500,
                                letterSpacing: 0.3,
                            }}
                        >
                            {doneSteps}/{totalSteps} Schritte
                        </Tag>
                    </div>
                </Col>
            </Row>
            <Row gutter={[24, 24]}>
                {DDD_STEPS.map((step) => {
                    const meta = DDD_STEP_META[step];
                    const c = project.content[step];
                    const done = c.completed;
                    return (
                        <Col key={step} xs={24} sm={12} lg={8} xxl={6}>
                            <Card
                                size="small"
                                title={<span>{meta.label}</span>}
                                extra={done ? <Tag color="green">Abgeschlossen</Tag> : <Tag>Offen</Tag>}
                                style={{
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                            >
                                <Text strong>Ziel</Text>
                                <Paragraph style={{ marginBottom: 8 }} type="secondary">
                                    {meta.goal}
                                </Paragraph>
                                <div
                                    style={{
                                        marginTop: "auto",
                                        display: "flex",
                                        justifyContent: "flex-end",
                                    }}
                                >
                                    <Button
                                        size="small"
                                        type="link"
                                        onClick={() => nav(`/projects/${id}/steps/${step}`)}
                                    >
                                        Öffnen
                                    </Button>
                                </div>
                            </Card>
                        </Col>
                    );
                })}
            </Row>
        </div>
    );
}
