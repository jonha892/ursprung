import React, { useCallback } from "react";
import { Card, Tag, Typography, Progress, theme } from "antd";
import { useConfigStore } from "../stores/configStore.ts";
import type { DddProject } from "../../../../packages/shared/ddd_project.ts";
import {
  DDD_STEPS,
  DDD_STEP_META,
} from "../../../../packages/shared/ddd_project.ts";

const { Paragraph, Text, Link } = Typography;

export interface ProjectCardProps {
  project: DddProject;
  onOpen?: (id: string) => void;
}

function calcProgress(p: DddProject) {
  let done = 0;
  for (const k of DDD_STEPS) {
    const c = p.content[k];
    if (c.notes.trim().length > 0 || c.attachments.length > 0 || c.completed)
      done++;
  }
  return {
    done,
    total: DDD_STEPS.length,
    pct: Math.round((done / DDD_STEPS.length) * 100),
  };
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onOpen,
}) => {
  const { token } = theme.useToken();
  const resolvedTheme = useConfigStore((s) => s.resolvedTheme);
  const prog = calcProgress(project);
  const active = DDD_STEPS.some((k) => project.content[k].completed === false);
  const firstUndone = DDD_STEPS.find(
    (k) => project.content[k].completed === false
  );
  const handleOpen = useCallback(
    () => onOpen?.(project.id),
    [onOpen, project.id]
  );

  // Derive a subtle elevated background for dark mode; keep white in light mode
  const isDark = resolvedTheme === "dark";
  const cardBg = isDark ? token.colorBgContainer : token.colorBgContainer;
  const cardStyle: React.CSSProperties = {
    width: 500,
    flex: "0 1 500px",
    background: cardBg,
  };

  return (
    <Card
      title={<span>{project.name}</span>}
      style={cardStyle}
      extra={
        <Tag color={active ? "gold" : "default"}>
          {active ? "Aktiv" : "Archiv"}
        </Tag>
      }
    >
      <Paragraph type="secondary" style={{ minHeight: 40 }}>
        {project.abstract}
      </Paragraph>
      <div style={{ marginBottom: 4 }}>
        <Text strong>
          {firstUndone
            ? `Phase: ${DDD_STEP_META[firstUndone].label}`
            : "Fertig"}
        </Text>
        <span style={{ float: "right" }}>
          {prog.done}/{prog.total} Schritte
        </span>
      </div>
      <Progress percent={prog.pct} size="small" showInfo={false} />
      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          Zuletzt bearbeitet: {new Date(project.updatedAt).toLocaleDateString()}
        </Text>
        <Link onClick={handleOpen}>Öffnen →</Link>
      </div>
    </Card>
  );
};
