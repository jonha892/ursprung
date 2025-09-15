import React, { useEffect } from "react";
import { Button, Card, Col, Empty, Flex, Row, Skeleton, theme, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useProjectStore } from "../stores/projectStore.ts";
import { NewProjectModal } from "../components/NewProjectModal.tsx";
import { ProjectCard } from "../components/ProjectCard.tsx";
import { Profile } from "../components/Profile.tsx";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

export default function Dashboard() {
    const { load, loading, projects, loaded, addProject } = useProjectStore(
        (s) => s,
    );
    const { token } = theme.useToken();
    const [modalOpen, setModalOpen] = React.useState(false);
    const nav = useNavigate();

    useEffect(() => {
        if (!loaded && !loading) load();
    }, [loaded, loading, load]);

    return (
        <div
            style={{
                padding: "96px 32px 32px",
                maxWidth: 1280,
                margin: "0 auto",
            }}
        >
            <Profile />

            <Row
                align="middle"
                justify="space-between"
                wrap={false}
                style={{
                    padding: "8px 0 16px",
                    borderBottom: `2px solid ${token.colorBorder || "#e5e5e5"}`,
                    marginBottom: 24,
                }}
            >
                <Col>
                    <Title level={2} style={{ margin: 0 }}>
                        Deine Projekte
                    </Title>
                </Col>
                <Col>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setModalOpen(true)}
                    >
                        Neues Projekt
                    </Button>
                </Col>
            </Row>
            <NewProjectModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreated={(p) => addProject(p)}
            />
            {loading && !projects.length
                ? (
                    <Flex gap={24} wrap justify="center">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <Card key={i} style={{ width: 420 }}>
                                <Skeleton active paragraph={{ rows: 4 }} />
                            </Card>
                        ))}
                    </Flex>
                )
                : projects.length === 0
                ? <Empty description="Noch keine Projekte" style={{ marginTop: 32 }} />
                : (
                    <Flex gap={32} wrap justify="center" style={{ marginTop: 8 }}>
                        {projects.map((p) => (
                            <ProjectCard
                                key={p.id}
                                project={p}
                                onOpen={(id) => nav(`/projects/${id}`)}
                            />
                        ))}
                    </Flex>
                )}
        </div>
    );
}
