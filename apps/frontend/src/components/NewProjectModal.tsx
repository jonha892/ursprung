import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Typography, App as AntApp } from "antd";
import type { DddProject } from "../../../../packages/shared/ddd_project.ts";
import { createNewProject } from "../../../../packages/shared/ddd_project.ts";
import { projectService } from "../lib/project_service.ts";

export interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (p: DddProject) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [previewId, setPreviewId] = useState("");
  const nameValue = Form.useWatch("name", form);

  // slug + random hash generation (same scheme as service) with debounce
  function buildId(name: string) {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    const hash = Math.random().toString(36).slice(2, 8); // TODO "Is this a hash?
    return `${slug}-${hash}`;
  }

  useEffect(() => {
    if (!nameValue || !nameValue.trim()) {
      setPreviewId("");
      return;
    }
    const handle = setTimeout(() => {
      setPreviewId(buildId(nameValue));
    }, 300);
    return () => clearTimeout(handle);
  }, [nameValue]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      // reuse existing previewId if present to keep user-visible ID stable
      const id = previewId || buildId(values.name);
      const proj = createNewProject(values.name, id, values.abstract);
      const saved = await projectService.insert(proj);
      onCreated(saved);
      setCreating(false);
      form.resetFields();
      onClose();
      message.success("Projekt erstellt");
    } catch (e) {
      const err = e as unknown;
      if (typeof err === "object" && err && "errorFields" in err) return; // validation error
      setCreating(false);
      message.error("Erstellen fehlgeschlagen");
    }
  };

  const handleCancel = () => {
    if (creating) return;
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={`Neues Projekt`}
      open={open}
      onOk={handleOk}
      okText="Erstellen"
      confirmLoading={creating}
      onCancel={handleCancel}
    >
      <Form
        form={form}
        layout="vertical"
        disabled={creating}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <Form.Item
          label="Name"
          name="name"
          style={{ marginBottom: 12 }}
          rules={[
            { required: true, message: "Bitte Name eingeben" },
            { min: 3, message: "Mindestens 3 Zeichen" },
          ]}
          extra={
            <Typography.Text
              type="secondary"
              style={{ fontSize: 12, paddingLeft: 8 }}
            >
              {previewId.length > 0 ? `id: ${previewId}` : ""}
            </Typography.Text>
          }
        >
          <Input placeholder="Projektname" maxLength={80} autoFocus />
        </Form.Item>
        <Form.Item
          label="Kurzbeschreibung"
          name="abstract"
          style={{ marginBottom: 32 }}
          rules={[
            { required: true, message: "Bitte Beschreibung eingeben" },
            { min: 10, message: "Mindestens 10 Zeichen" },
          ]}
        >
          <Input.TextArea
            placeholder="Worum geht es..."
            autoSize={{ minRows: 2, maxRows: 4 }}
            maxLength={280}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
