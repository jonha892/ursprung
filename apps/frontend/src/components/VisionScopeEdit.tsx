import { useState } from "react";
import { App as AntApp, Form, Input, Switch } from "antd";
import { tool } from "@openai/agents";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "../stores/projectStore.ts";
import { useApiKeyStore } from "../stores/apiKeyStore.ts";
import { type DddProject, DddStepKind, type VisionScopeContent } from "../../../../packages/shared/ddd_project.ts";
import { createStepAgent } from "../config/agentFactory.ts";
import { Chat } from "./Chat.tsx";
import { useDebouncedFormSave } from "../lib/useDebouncedFormSave.ts";
import { useSyncedCardHeight } from "../lib/useSyncedCardHeight.ts";
import { StepEditLayout } from "./StepEditLayout.tsx";

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

    const stepContent: VisionScopeContent = project.content[DddStepKind.VisionScope];

    const { cardRef: editCardRef, contentHeight: syncedHeight } = useSyncedCardHeight();

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
        <StepEditLayout
            project={project}
            stepKind={DddStepKind.VisionScope}
            completed={stepContent.completed}
            editCardRef={editCardRef}
            onBack={handleBack}
            onSubmit={() => form.submit()}
            isSubmitting={loading || isSaving}
            chat={<Chat agent={agent} project={project} height={syncedHeight} />}
        >
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
        </StepEditLayout>
    );
}
