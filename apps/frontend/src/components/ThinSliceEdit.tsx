import { useState } from "react";
import { App as AntApp, Form, Input, Switch } from "antd";
import { tool } from "@openai/agents";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "../stores/projectStore.ts";
import { useApiKeyStore } from "../stores/apiKeyStore.ts";
import { type DddProject, DddStepKind, type ThinSliceContent } from "../../../../packages/shared/ddd_project.ts";
import { createStepAgent } from "../config/agentFactory.ts";
import { Chat } from "./Chat.tsx";
import { useDebouncedFormSave } from "../lib/useDebouncedFormSave.ts";
import { useSyncedCardHeight } from "../lib/useSyncedCardHeight.ts";
import { StepEditLayout } from "./StepEditLayout.tsx";

interface ThinSliceEditProps {
    project: DddProject;
}

export function ThinSliceEdit({ project }: ThinSliceEditProps) {
    const [loading, setLoading] = useState(false);
    const updateProject = useProjectStore((s) => s.updateProject);
    const { message, notification } = AntApp.useApp();
    const nav = useNavigate();
    const [form] = Form.useForm();
    const { getSelectedApiKey } = useApiKeyStore();

    const stepContent: ThinSliceContent = project.content[DddStepKind.ThinSlice];

    const { cardRef: editCardRef, contentHeight: syncedHeight } = useSyncedCardHeight();

    const statementTool = tool({
        name: "set_statement",
        description: "Set Thin Slice statement.",
        strict: true,
        parameters: {
            type: "object",
            properties: { statement: { type: "string" } },
            required: ["statement"],
            additionalProperties: false,
        },
        execute: (input: unknown) => {
            const value = (input as { statement?: string })?.statement ?? "";
            form.setFieldValue("statement", String(value).trim());
            return { ok: true, field: "statement", scheduled: true };
        },
    });

    const criteriaTool = tool({
        name: "set_acceptance_criteria",
        description: "Set Thin Slice acceptance criteria.",
        strict: true,
        parameters: {
            type: "object",
            properties: { acceptanceCriteria: { type: "string" } },
            required: ["acceptanceCriteria"],
            additionalProperties: false,
        },
        execute: (input: unknown) => {
            const value = (input as { acceptanceCriteria?: string })?.acceptanceCriteria ?? "";
            form.setFieldValue("acceptanceCriteria", String(value).trim());
            return { ok: true, field: "acceptanceCriteria", scheduled: true };
        },
    });

    const selectedApiKey = getSelectedApiKey();
    const agent = selectedApiKey ? createStepAgent(selectedApiKey.key, DddStepKind.ThinSlice, [statementTool, criteriaTool]) : null;

    const initialValues = {
        statement: stepContent.statement || "",
        acceptanceCriteria: stepContent.acceptanceCriteria || "",
        completed: stepContent.completed,
    };

    const handleBack = () => nav(`/projects/${project.id}`);

    const { onValuesChange, triggerSaveNow, isSaving } = useDebouncedFormSave<{ statement: string; acceptanceCriteria: string; completed: boolean }>(form, {
        delay: 5000,
        onSave: async (values) => {
            setLoading(true);
            try {
                const updatedContent = {
                    ...stepContent,
                    statement: values.statement,
                    acceptanceCriteria: values.acceptanceCriteria,
                    completed: values.completed,
                    updatedAt: new Date().toISOString(),
                };
                const updatedProject = {
                    ...project,
                    content: {
                        ...project.content,
                        [DddStepKind.ThinSlice]: updatedContent,
                    },
                    updatedAt: new Date().toISOString(),
                };
                await updateProject(updatedProject);
                notification.success({ key: "thin-slice-autosave", message: "Automatisch gespeichert", placement: "bottomRight", duration: 1.5 });
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
            stepKind={DddStepKind.ThinSlice}
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
                <Form.Item label="Slice-Statement" name="statement" extra="Kurz die vertikale Scheibe beschreiben.">
                    <Input.TextArea rows={4} placeholder="Statement..." />
                </Form.Item>
                <Form.Item label="Akzeptanzkriterien" name="acceptanceCriteria" extra="3–5 Kriterien, jeweils eine Zeile.">
                    <Input.TextArea rows={4} placeholder="1) ...\n2) ..." />
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
