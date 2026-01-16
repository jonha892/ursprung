import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Input, Space, Typography } from "antd";
import { Tldraw } from "tldraw";
import type { Editor, TLStoreSnapshot } from "@tldraw/editor";
import { createShapeId, toRichText } from "@tldraw/tlschema";
import "tldraw/tldraw.css";

interface DddPaletteItem {
    id: string;
    label: string;
    description: string;
    color: string;
    fill: "none" | "solid" | "semi";
    textColor: string;
}

const CARD_WIDTH = 360;
const CARD_HEIGHT = 180;

const DDD_ITEMS: DddPaletteItem[] = [
    {
        id: "ddd-event",
        label: "Domain Event",
        description: "Facts that document something that happened in the domain.",
        color: "orange",
        fill: "solid",
        textColor: "black",
    },
    {
        id: "ddd-command",
        label: "Command",
        description: "Intent expressed by an actor to change state.",
        color: "blue",
        fill: "solid",
        textColor: "black",
    },
    {
        id: "ddd-actor",
        label: "Actor",
        description: "Person or system that issues commands and observes events.",
        color: "yellow",
        fill: "solid",
        textColor: "black",
    },
];

export function TldrawEventStorming() {
    const editorRef = useRef<Editor | null>(null);
    const changeHandlerRef = useRef<(() => void) | null>(null);

    const [snapshot, setSnapshot] = useState<string>("// Interact with the canvas to capture a snapshot");
    const [importBuffer, setImportBuffer] = useState<string>("");
    const [importError, setImportError] = useState<string | null>(null);

    const palette = useMemo(() => DDD_ITEMS, []);

    const insertCard = (item: DddPaletteItem) => {
        const editor = editorRef.current;
        if (!editor) return;

        const viewport = editor.getViewportPageBounds();
        const centerX = viewport.x + viewport.width / 2;
        const centerY = viewport.y + viewport.height / 2;

        const shapeId = createShapeId();
        editor.createShapes([
            {
                id: shapeId,
                type: "geo",
                x: centerX - CARD_WIDTH / 2,
                y: centerY - CARD_HEIGHT / 2,
                props: {
                    geo: "rectangle",
                    color: item.color,
                    labelColor: item.textColor,
                    fill: item.fill,
                    dash: "solid",
                    size: "m",
                    font: "draw",
                    align: "middle",
                    verticalAlign: "middle",
                    richText: toRichText(item.label),
                    url: "",
                    growY: 0,
                    scale: 1,
                    w: CARD_WIDTH,
                    h: CARD_HEIGHT,
                },
            },
        ]);
        editor.select(shapeId);
    };

    const handleImport = () => {
        const editor = editorRef.current;
        if (!editor) return;

        try {
            const parsed = JSON.parse(importBuffer) as TLStoreSnapshot;
            editor.loadSnapshot(parsed);
            setImportError(null);
            const snapshotData = editor.getSnapshot();
            setSnapshot(JSON.stringify(snapshotData, null, 2));
        } catch (error) {
            console.error("Failed to load tldraw snapshot", error);
            setImportError("Snapshot JSON is invalid.");
        }
    };

    useEffect(() => {
        return () => {
            changeHandlerRef.current?.();
            changeHandlerRef.current = null;
        };
    }, []);

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <header style={{ marginBottom: 16 }}>
                <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 8 }}>
                    EventStorming Canvas (tldraw)
                </Typography.Title>
                <Typography.Paragraph style={{ marginBottom: 12 }}>
                    Drop curated DDD building blocks onto the canvas. These are rendered using the tldraw editor to compare editing experiences.
                </Typography.Paragraph>
                <Space wrap>
                    {palette.map((item) => (
                        <Button
                            key={item.id}
                            size="large"
                            onClick={() => insertCard(item)}
                            style={{
                                backgroundColor: item.color === "yellow" ? "#fef08a" : item.color === "orange" ? "#fed7aa" : "#bfdbfe",
                                borderColor: item.color === "orange" ? "#f97316" : item.color === "yellow" ? "#f59e0b" : "#2563eb",
                                color: item.textColor,
                                fontWeight: 600,
                            }}
                        >
                            {item.label}
                        </Button>
                    ))}
                </Space>
            </header>
            <div style={{ flex: 1, borderRadius: 16, overflow: "hidden", position: "relative" }}>
                <Tldraw
                    onMount={(editor) => {
                        editorRef.current = editor;

                        const handleChange = () => {
                            try {
                                const snapshotData = editor.getSnapshot();
                                setSnapshot(JSON.stringify(snapshotData, null, 2));
                            } catch (error) {
                                console.error("Failed to read tldraw snapshot", error);
                            }
                        };

                        editor.on("change", handleChange);
                        changeHandlerRef.current = () => editor.off("change", handleChange);
                        handleChange();
                    }}
                />
            </div>
            <div style={{ marginTop: 24, display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1fr)" }}>
                <Card
                    size="small"
                    title="Live Snapshot"
                    style={{ maxHeight: 280, overflow: "auto" }}
                    styles={{
                        body: {
                            fontFamily: "ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace",
                            whiteSpace: "pre",
                            fontSize: 12,
                        },
                    }}
                >
                    {snapshot}
                </Card>
                <Card size="small" title="Import Snapshot">
                    <Space direction="vertical" style={{ width: "100%" }}>
                        <Input.TextArea
                            value={importBuffer}
                            onChange={(event) => setImportBuffer(event.target.value)}
                            rows={6}
                            placeholder="Paste a snapshot JSON captured from the panel above"
                        />
                        <Space>
                            <Button type="primary" onClick={handleImport} disabled={!importBuffer.trim()}>
                                Load Snapshot
                            </Button>
                            <Button onClick={() => setImportBuffer("")}>Clear</Button>
                        </Space>
                        {importError && (
                            <Typography.Text type="danger">{importError}</Typography.Text>
                        )}
                    </Space>
                </Card>
            </div>
        </div>
    );
}
