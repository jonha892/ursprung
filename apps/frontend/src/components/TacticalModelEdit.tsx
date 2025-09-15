import { useState } from "react";
import { App as AntApp } from "antd";
import { BaseStepEdit, type BaseStepFormValues } from "./BaseStepEdit.tsx";
import { useProjectStore } from "../stores/projectStore.ts";
import { type DddProject, DddStepKind } from "../../../../packages/shared/ddd_project.ts";

interface TacticalModelEditProps {
    project: DddProject;
}

export function TacticalModelEdit({ project }: TacticalModelEditProps) {
    const [loading, setLoading] = useState(false);
    const updateProject = useProjectStore((s) => s.updateProject);
    const { message } = AntApp.useApp();

    const handleSave = async (values: BaseStepFormValues) => {
        setLoading(true);
        try {
            const stepContent = project.content[DddStepKind.TacticalModel];
            const updatedContent = {
                ...stepContent,
                completed: values.completed || false,
                updatedAt: new Date().toISOString(),
            };

            const updatedProject = {
                ...project,
                content: {
                    ...project.content,
                    [DddStepKind.TacticalModel]: updatedContent,
                },
                updatedAt: new Date().toISOString(),
            };

            await updateProject(updatedProject);
            message.success("Taktisches Modell gespeichert");
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
            stepKind={DddStepKind.TacticalModel}
            onSave={handleSave}
            loading={loading}
        />
    );
}
