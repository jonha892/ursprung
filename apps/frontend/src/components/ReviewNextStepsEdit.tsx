import { useState } from "react";
import { App as AntApp, Form, Input, Switch } from "antd";
import { tool } from "@openai/agents";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "../stores/projectStore.ts";
import { useApiKeyStore } from "../stores/apiKeyStore.ts";
import { type DddProject, DddStepKind, type ReviewNextStepsContent } from "../../../../packages/shared/ddd_project.ts";
import { createStepAgent } from "../config/agentFactory.ts";
import { Chat } from "./Chat.tsx";
import { useDebouncedFormSave } from "../lib/useDebouncedFormSave.ts";
import { useSyncedCardHeight } from "../lib/useSyncedCardHeight.ts";
import { StepEditLayout } from "./StepEditLayout.tsx";

interface ReviewNextStepsEditProps {
    project: DddProject;
}

export function ReviewNextStepsEdit({ project }: ReviewNextStepsEditProps) {
    const [loading, setLoading] = useState(false);
    const updateProject = useProjectStore((s) => s.updateProject);
    const { message, notification } = AntApp.useApp();
    const nav = useNavigate();
    const [form] = Form.useForm();
    const { getSelectedApiKey } = useApiKeyStore();

    const stepContent: ReviewNextStepsContent = project.content[DddStepKind.ReviewNextSteps];

    const { cardRef: editCardRef, contentHeight: syncedHeight } = useSyncedCardHeight();

    const retroTool = tool({
        name: "set_retro",
        description: "Set review retrospective notes.",
        strict: true,
        parameters: { type: "object", properties: { retro: { type: "string" } }, required: ["retro"], additionalProperties: false },
        execute: (input: unknown) => {
            const value = (input as { retro?: string })?.retro ?? "";
            form.setFieldValue("retro", String(value).trim());
            return { ok: true, field: "retro", scheduled: true };
        },
    });

    const nextStepsTool = tool({
        name: "set_next_steps",
        description: "Set next steps backlog.",
        strict: true,
        parameters: { type: "object", properties: { nextSteps: { type: "string" } }, required: ["nextSteps"], additionalProperties: false },
        execute: (input: unknown) => {
            const value = (input as { nextSteps?: string })?.nextSteps ?? "";
            form.setFieldValue("nextSteps", String(value).trim());
            return { ok: true, field: "nextSteps", scheduled: true };
        },
    });

    const selectedApiKey = getSelectedApiKey();
    const agent = selectedApiKey ? createStepAgent(selectedApiKey.key, DddStepKind.ReviewNextSteps, [retroTool, nextStepsTool]) : null;

    const initialValues = { retro: stepContent.retro || "", nextSteps: stepContent.nextSteps || "", completed: stepContent.completed };

    const handleBack = () => nav(`/projects/${project.id}`);

    const { onValuesChange, triggerSaveNow, isSaving } = useDebouncedFormSave<{ retro: string; nextSteps: string; completed: boolean }>(form, {
        delay: 5000,
        onSave: async (values) => {
            setLoading(true);
            try {
                const updatedContent = {
                    ...stepContent,
                    retro: values.retro,
                    nextSteps: values.nextSteps,
                    completed: values.completed,
                    updatedAt: new Date().toISOString(),
                };
                const updatedProject = {
                    ...project,
                    content: { ...project.content, [DddStepKind.ReviewNextSteps]: updatedContent },
                    updatedAt: new Date().toISOString(),
                };
                await updateProject(updatedProject);
                notification.success({ key: "review-autosave", message: "Automatisch gespeichert", placement: "bottomRight", duration: 1.5 });
            } catch (e) {
                console.error(e);
                message.error("Fehler beim Speichern");
            } finally {
                setLoading(false);
            }
        },
    });

    return (
        <StepEditLayout
            project={project}
            stepKind={DddStepKind.ReviewNextSteps}
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
                    notification.success({ message: "Gespeichert", placement: "bottomRight", duration: 1.8 });
                }}
                initialValues={initialValues}
                style={{ flex: 1, display: "flex", flexDirection: "column" }}
            >
                <Form.Item label="Review/Retrospektive" name="retro" extra="Was ist klar vs. wacklig?">
                    <Input.TextArea rows={4} placeholder="Retro..." />
                </Form.Item>
                <Form.Item
                    label="Nächste Schritte (Backlog)"
                    name="nextSteps"
                    extra="Kommender Slice, Risiken, offene Architekturentscheidungen."
                >
                    <Input.TextArea rows={4} placeholder="- ...\n- ..." />
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
