import { useState } from "react";
import { App as AntApp } from "antd";
import { BaseStepEdit, type BaseStepFormValues } from "./BaseStepEdit.tsx";
import { useProjectStore } from "../stores/projectStore.ts";
import { type DddProject, DddStepKind } from "../../../../packages/shared/ddd_project.ts";

interface UbiquitousLanguageEditProps {
    project: DddProject;
}

export function UbiquitousLanguageEdit({ project }: UbiquitousLanguageEditProps) {
    const [loading, setLoading] = useState(false);
    const updateProject = useProjectStore((s) => s.updateProject);
    const { message } = AntApp.useApp();

    const handleSave = async (values: BaseStepFormValues) => {
        setLoading(true);
        try {
            const stepContent = project.content[DddStepKind.UbiquitousLanguage];
            const updatedContent = {
                ...stepContent,
                completed: values.completed || false,
                updatedAt: new Date().toISOString(),
            };

            const updatedProject = {
                ...project,
                content: {
                    ...project.content,
                    [DddStepKind.UbiquitousLanguage]: updatedContent,
                },
                updatedAt: new Date().toISOString(),
            };

            await updateProject(updatedProject);
            message.success("Ubiquitous Language gespeichert");
        } catch (error) {
            console.error("Failed to save:", error);
            message.error("Fehler beim Speichern");
        } finally {
            setLoading(false);
        }
    };

    return (
        <BaseStepEdit
            project={project}
            stepKind={DddStepKind.UbiquitousLanguage}
            onSave={handleSave}
            loading={loading}
        />
    );
}
