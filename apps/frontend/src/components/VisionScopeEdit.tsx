import { useEffect, useRef, useState } from "react";
import { App as AntApp, Button, Card, Col, Form, Input, Row, Space, Switch, theme, Typography } from "antd";
import { tool } from "@openai/agents";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useProjectStore } from "../stores/projectStore.ts";
import { useApiKeyStore } from "../stores/apiKeyStore.ts";
import { DDD_STEP_META, type DddProject, DddStepKind } from "../../../../packages/shared/ddd_project.ts";
import { createStepAgent } from "../config/agentFactory.ts";
import { Chat } from "./Chat.tsx";
import { useDebouncedFormSave } from "../lib/useDebouncedFormSave.ts";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface VisionScopeFormValues {
    vision: string;
    scope: string;
    completed: boolean;
}

interface VisionScopeEditProps {
    project: DddProject;
}

export function VisionScopeEdit({ project }: VisionScopeEditProps) {
    const [loading, setLoading] = useState(false);
    const updateProject = useProjectStore((s) => s.updateProject);
    const { message, notification } = AntApp.useApp();
    const nav = useNavigate();
    const [form] = Form.useForm();
    const { getSelectedApiKey } = useApiKeyStore();
    const { token } = theme.useToken();

    const stepMeta = DDD_STEP_META[DddStepKind.VisionScope];
    const stepContent = project.content[DddStepKind.VisionScope];

    // Refs & state for dynamic height sync between edit card and chat
    const editCardRef = useRef<HTMLDivElement | null>(null);
    const [syncedHeight, setSyncedHeight] = useState<number>(400); // content height (chat receives this)

    useEffect(() => {
        const measure = () => {
            if (editCardRef.current) {
                // Subtract card header + padding approximation (60) similar to Chat component logic
                const raw = editCardRef.current.offsetHeight - 60;
                setSyncedHeight(Math.max(400, raw));
            }
        };
        measure();
        const ro = new ResizeObserver(() => measure());
        if (editCardRef.current) ro.observe(editCardRef.current);
        globalThis.addEventListener("resize", measure);
        return () => {
            globalThis.removeEventListener("resize", measure);
            ro.disconnect();
        };
    }, []);

    // Local tools for Vision & Scope editing / formatting
    const visionTool = tool({
        name: "set_vision",
        description: "Set the Vision value directly.",
        strict: true,
        parameters: {
            type: "object",
            properties: {
                vision: { type: "string", description: "The new Vision value" },
            },
            required: ["vision"],
            additionalProperties: false,
        },
        // deno-lint-ignore no-explicit-any
        execute: (input: any) => {
            const newVision = (input.vision || "").trim();
            form.setFieldValue("vision", newVision);
            // Debounced autosave will pick this up via onValuesChange
            return { ok: true, field: "vision", scheduled: true };
        },
    });

    const scopeTool = tool({
        name: "set_scope",
        description: "Set the Scope value directly.",
        strict: true,
        parameters: {
            type: "object",
            properties: {
                scope: { type: "string", description: "The new Scope value" },
            },
            required: ["scope"],
            additionalProperties: false,
        },
        // deno-lint-ignore no-explicit-any
        execute: (input: any) => {
            const newScope = (input.scope || "").trim();
            form.setFieldValue("scope", newScope);
            // Debounced autosave will pick this up via onValuesChange
            return { ok: true, field: "scope", scheduled: true };
        },
    });

    // Create agent if API key is available with local tools
    const selectedApiKey = getSelectedApiKey();
    const agent = selectedApiKey ? createStepAgent(selectedApiKey.key, DddStepKind.VisionScope, [visionTool, scopeTool]) : null;

    const initialValues = {
        vision: stepContent.vision || "",
        scope: stepContent.scope || "",
        completed: stepContent.completed,
    };

    const handleBack = () => {
        nav(`/projects/${project.id}`);
    };

    const { onValuesChange, triggerSaveNow, isSaving } = useDebouncedFormSave<VisionScopeFormValues>(form, {
        delay: 5000,
        onSave: async (values) => {
            setLoading(true);
            try {
                const updatedContent = {
                    ...stepContent,
                    vision: values.vision,
                    scope: values.scope,
                    completed: values.completed,
                    updatedAt: new Date().toISOString(),
                };
                const updatedProject = {
                    ...project,
                    content: {
                        ...project.content,
                        [DddStepKind.VisionScope]: updatedContent,
                    },
                    updatedAt: new Date().toISOString(),
                };
                await updateProject(updatedProject);
                notification.success({
                    key: "vision-scope-autosave",
                    message: "Automatisch gespeichert",
                    placement: "bottomRight",
                    duration: 1.5,
                });
            } catch (error) {
                console.error("Failed to save:", error);
                message.error("Fehler beim Speichern");
            } finally {
                setLoading(false);
            }
        },
    });

    return (
        <div style={{ padding: "96px 32px", maxWidth: 1280, margin: "0 auto" }}>
            {/* Breadcrumbs */}
            <Space style={{ marginBottom: 16 }}>
                <RouterLink to="/">Projekte</RouterLink>
                {" > "}
                <RouterLink to={`/projects/${project.id}`}>{project.name}</RouterLink>
                {" > "}
                {stepMeta.label}
            </Space>

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
                    <span style={{ color: stepContent.completed ? "green" : "orange" }}>
                        {stepContent.completed ? "Abgeschlossen" : "In Bearbeitung"}
                    </span>
                </Col>
            </Row>

            <Title level={2} style={{ marginBottom: 16 }}>
                {stepMeta.label}
            </Title>

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
                    <Text strong style={{ color: token.colorText }}>Goal:</Text>
                    <br />
                    <Text style={{ color: token.colorTextSecondary }}>{stepMeta.goal}</Text>
                </div>
                <div style={{ marginTop: 12 }}>
                    <Text strong style={{ color: token.colorText }}>Deliverable:</Text>
                    <br />
                    <Text style={{ color: token.colorTextSecondary }}>{stepMeta.deliverable}</Text>
                </div>
                <div style={{ marginTop: 12 }}>
                    <Text strong style={{ color: token.colorText }}>Example:</Text>
                    <br />
                    <Text style={{ color: token.colorTextSecondary }}>{stepMeta.example}</Text>
                </div>
            </Card>{" "}
            {/* Main Content */}
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                    <Card
                        ref={editCardRef}
                        bodyStyle={{ padding: 0, height: "100%", display: "flex", flexDirection: "column" }}
                    >
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, paddingBottom: 0 }}>
                            <Form
                                form={form}
                                layout="vertical"
                                onValuesChange={onValuesChange}
                                onFinish={async () => {
                                    await triggerSaveNow();
                                    notification.success({
                                        message: "Gespeichert",
                                        placement: "bottomRight",
                                        duration: 1.8,
                                    });
                                }}
                                initialValues={initialValues}
                                style={{ flex: 1, display: "flex", flexDirection: "column" }}
                            >
                                <Form.Item
                                    label="Vision"
                                    name="vision"
                                    extra="Beschreiben Sie die Vision des Produkts."
                                >
                                    <TextArea
                                        rows={4}
                                        placeholder="Für [Zielgruppe], die [Problem] haben, bietet [Produktname] [Lösung]. Anders als [Alternative] [Unique Value]."
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Scope"
                                    name="scope"
                                    extra="Definieren Sie den Scope, was ist explizit außerhalb?"
                                >
                                    <TextArea
                                        rows={4}
                                        placeholder="Out-of-Scope: (1) Feature X wird nicht unterstützt, (2) Integration Y ist nicht geplant, etc."
                                    />
                                </Form.Item>

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

                                <div style={{ marginTop: "auto" }} />
                            </Form>
                            <div style={{ padding: 16, paddingTop: 8 }}>
                                <Space>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        onClick={() => form.submit()}
                                        loading={loading || isSaving}
                                        icon={<SaveOutlined />}
                                    >
                                        Speichern
                                    </Button>
                                    <Button onClick={handleBack}>Abbrechen</Button>
                                </Space>
                            </div>
                        </div>
                    </Card>
                </Col>

                {/* AI Chat Column */}
                <Col xs={24} lg={8}>
                    <Chat agent={agent} project={project} height={syncedHeight} />
                </Col>
            </Row>
        </div>
    );
}
