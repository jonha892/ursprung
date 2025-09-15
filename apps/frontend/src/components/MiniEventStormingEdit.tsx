import { useState } from "react";
import { App as AntApp } from "antd";
import { BaseStepEdit, type BaseStepFormValues } from "./BaseStepEdit.tsx";
import { useProjectStore } from "../stores/projectStore.ts";
import { type DddProject, DddStepKind } from "../../../../packages/shared/ddd_project.ts";

interface MiniEventStormingEditProps {
    project: DddProject;
}

export function MiniEventStormingEdit({ project }: MiniEventStormingEditProps) {
    const [loading, setLoading] = useState(false);
    const updateProject = useProjectStore((s) => s.updateProject);
    const { message } = AntApp.useApp();

    const handleSave = async (values: BaseStepFormValues) => {
        setLoading(true);
        try {
            const stepContent = project.content[DddStepKind.MiniEventStorming];
            const updatedContent = {
                ...stepContent,
                completed: values.completed || false,
                updatedAt: new Date().toISOString(),
            };

            const updatedProject = {
                ...project,
                content: {
                    ...project.content,
                    [DddStepKind.MiniEventStorming]: updatedContent,
                },
                updatedAt: new Date().toISOString(),
            };

            await updateProject(updatedProject);
            message.success("Mini-Event-Storming gespeichert");
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
            stepKind={DddStepKind.MiniEventStorming}
            onSave={handleSave}
            loading={loading}
        >
            {/* Future: Custom fields for Event Storming */}
            {
                /*
      <Form.Item
        label="Domain Events"
        name="domainEvents"
        extra="15-25 Events in Vergangenheitsform (z.B. InvoiceCreated, PaymentReceived)"
      >
        <TextArea
          rows={6}
          placeholder="InvoiceCreated
PaymentReceived
CustomerNotified
..."
        />
      </Form.Item>

      <Form.Item
        label="Commands"
        name="commands"
        extra="5-10 Commands (Imperative, z.B. CreateInvoice, ProcessPayment)"
      >
        <TextArea
          rows={4}
          placeholder="CreateInvoice
ProcessPayment
SendNotification
..."
        />
      </Form.Item>

      <Form.Item
        label="Externe Systeme"
        name="externalSystems"
        extra="3-5 externe Services/Systeme"
      >
        <TextArea
          rows={3}
          placeholder="EmailService
PaymentProvider
DocumentStorage
..."
        />
      </Form.Item>

      <Divider />
      */
            }
        </BaseStepEdit>
    );
}
