import { useEffect, useRef } from "react";
import { useParams, Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Card,
  Typography,
  Row,
  Col,
  Breadcrumb,
  Button,
  Tag,
  theme,
} from "antd";
import { App as AntApp } from "antd";
import { useProjectStore } from "../stores/projectStore.ts";
import {
  DDD_STEPS,
  DDD_STEP_META,
} from "../../../../packages/shared/ddd_project.ts";

const { Title, Paragraph, Text } = Typography;

export default function ProjectOverview() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  // Select each field individually to keep referential stability and
  // avoid React 18 StrictMode double-invoke causing an infinite loop warning.
  const projects = useProjectStore((s) => s.projects);
  const project = projects.find((p) => p.id === id);
  const { message } = AntApp.useApp();
  const redirectedRef = useRef(false);

  // We intentionally do NOT load here to avoid duplicate fetch; assume Dashboard preloaded.
  // If user navigates directly (e.g., deep link), we might not have data; in that case show message.

  // If project not found just redirect with an error toast.
  useEffect(() => {
    if (!project && !redirectedRef.current) {
      redirectedRef.current = true;
      message.error("Projekt nicht gefunden");
      nav("/", { replace: true });
    }
  }, [project, nav, message]);

  // theme token hook reserved for future styling adjustments
  theme.useToken();

  if (!project) return null; // redirect effect handles UX

  // Pre-compute progress metrics once per render
  const totalSteps = DDD_STEPS.length;
  const doneSteps = DDD_STEPS.reduce((acc, step) => {
    const c = project.content[step];
    return acc + (c.completed || c.notes.trim().length > 0 ? 1 : 0);
  }, 0);
  const allDone = doneSteps === totalSteps;

  return (
    <div style={{ padding: "96px 32px", maxWidth: 1280, margin: "0 auto" }}>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <RouterLink to="/">Projekte</RouterLink>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{project.name}</Breadcrumb.Item>
      </Breadcrumb>
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
        </Col>
      </Row>
      <Row gutter={[24, 24]}>
        {DDD_STEPS.map((step) => {
          const meta = DDD_STEP_META[step];
          const c = project.content[step];
          const done = c.completed || c.notes.trim().length > 0;
          return (
            <Col key={step} xs={24} sm={12} lg={8} xxl={6}>
              <Card
                size="small"
                title={<span>{meta.label}</span>}
                extra={
                  done ? <Tag color="green">Fertig</Tag> : <Tag>Offen</Tag>
                }
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
                bodyStyle={{ display: "flex", flexDirection: "column", gap: 8 }}
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
                  <Button size="small" type="link">
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
