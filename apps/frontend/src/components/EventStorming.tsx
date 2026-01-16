import { useCallback, useMemo, useRef, useState } from "react";
import { Button, Card, Space, Tooltip, Typography } from "antd";
import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import type {
    AppState,
    BinaryFiles,
    ExcalidrawImperativeAPI,
    ExcalidrawInitialDataState,
    LibraryItem,
    LibraryItems,
    OrderedExcalidrawElement,
} from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";

type DddLibraryItemId = "ddd-event" | "ddd-command" | "ddd-actor";

type TemplateElement = LibraryItem["elements"][number];

type DddLibraryConfig = {
    id: DddLibraryItemId;
    label: string;
    description: string;
    fill: string;
    stroke: string;
    text: string;
};

const CARD_WIDTH = 320;
const CARD_HEIGHT = 160;
const TEXT_WIDTH = 240;
const TEXT_HEIGHT = 56;

const DDD_LIBRARY_CONFIG: DddLibraryConfig[] = [
    {
        id: "ddd-event",
        label: "Domain Event",
        description: "Facts that happened in the domain and trigger follow-up behaviour.",
        fill: "#ffedd5",
        stroke: "#f97316",
        text: "#7c2d12",
    },
    {
        id: "ddd-command",
        label: "Command",
        description: "Intention expressed by an actor to change the system state.",
        fill: "#dbeafe",
        stroke: "#2563eb",
        text: "#1e3a8a",
    },
    {
        id: "ddd-actor",
        label: "Actor",
        description: "Person or system that issues commands and observes events.",
        fill: "#fef3c7",
        stroke: "#f59e0b",
        text: "#7c2d12",
    },
];

function stableNumber(seed: number, step: number): number {
    // simple LCG to get deterministic but distinct numbers per element
    return Math.abs(Math.imul(seed + 1, 48271 + step) % 1_000_000_000);
}

function createCardLibraryItem(config: DddLibraryConfig, index: number): LibraryItem {
    const baseSeed = (index + 1) * 1000;
    const groupId = `${config.id}-group`;
    const rect: TemplateElement = {
        type: "rectangle",
        version: 1,
        versionNonce: stableNumber(baseSeed, 1),
        isDeleted: false,
        id: `${config.id}-rect`,
        fillStyle: "solid",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        angle: 0,
        x: 0,
        y: 0,
        strokeColor: config.stroke,
        backgroundColor: config.fill,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        seed: stableNumber(baseSeed, 2),
        groupIds: [groupId],
        boundElements: [],
        strokeSharpness: "sharp",
        roundness: {
            type: 3,
        },
        updated: 1,
        link: null,
        locked: false,
    };

    const textX = (CARD_WIDTH - TEXT_WIDTH) / 2;
    const textY = (CARD_HEIGHT - TEXT_HEIGHT) / 2;

    const text: TemplateElement = {
        type: "text",
        version: 1,
        versionNonce: stableNumber(baseSeed, 3),
        isDeleted: false,
        id: `${config.id}-text`,
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        angle: 0,
        x: textX,
        y: textY,
        strokeColor: config.text,
        backgroundColor: "transparent",
        width: TEXT_WIDTH,
        height: TEXT_HEIGHT,
        seed: stableNumber(baseSeed, 4),
        groupIds: [groupId],
        boundElements: [],
        strokeSharpness: "sharp",
        fontSize: 32,
        fontFamily: 1,
        text: config.label,
        baseline: 44,
        textAlign: "center",
        verticalAlign: "middle",
    } as TemplateElement;

    return {
        id: config.id,
        status: "unpublished",
        name: config.label,
        created: 1,
        elements: [rect, text],
    } satisfies LibraryItem;
}

const BASE_LIBRARY_ITEMS = Object.freeze(
    DDD_LIBRARY_CONFIG.map((config, index) => createCardLibraryItem(config, index)) as LibraryItems,
);

const ALLOWED_LIBRARY_SIGNATURE = createLibrarySignature(BASE_LIBRARY_ITEMS);

function cloneLibraryItems(items: LibraryItems): LibraryItems {
    return items.map((item) => ({
        ...item,
        elements: item.elements.map((element) => ({ ...element })),
    })) as LibraryItems;
}

function createLibrarySignature(items: LibraryItems): string {
    const normalized = [...items]
        .map((item) => ({
            name: item.name,
            status: item.status,
            elements: item.elements.map((element) => {
                const {
                    id: _id,
                    seed: _seed,
                    version: _version,
                    versionNonce: _versionNonce,
                    boundElements: _boundElements,
                    updated: _updated,
                    link: _link,
                    locked: _locked,
                    groupIds: _groupIds,
                    ...rest
                } = element as Record<string, unknown>;
                return rest;
            }),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    return JSON.stringify(normalized);
}

function getFreshLibraryItems(): LibraryItems {
    return cloneLibraryItems(BASE_LIBRARY_ITEMS);
}

function randomId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function randomSeed(): number {
    return Math.floor(Math.random() * 1_000_000_000);
}

function getBounds(elements: readonly TemplateElement[]) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const element of elements) {
        const width = typeof element.width === "number" ? element.width : 0;
        const height = typeof element.height === "number" ? element.height : 0;
        minX = Math.min(minX, element.x);
        minY = Math.min(minY, element.y);
        maxX = Math.max(maxX, element.x + width);
        maxY = Math.max(maxY, element.y + height);
    }

    return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
    };
}

function cloneLibraryItemElements(
    item: LibraryItem,
    appState: ReturnType<ExcalidrawImperativeAPI["getAppState"]>,
) {
    const bounds = getBounds(item.elements as TemplateElement[]);
    const zoom = appState.zoom.value;
    const viewportCenterX = appState.scrollX + appState.width / (2 * zoom);
    const viewportCenterY = appState.scrollY + appState.height / (2 * zoom);

    const targetMinX = viewportCenterX - bounds.width / 2;
    const targetMinY = viewportCenterY - bounds.height / 2;
    const offsetX = targetMinX - bounds.minX;
    const offsetY = targetMinY - bounds.minY;
    const groupId = randomId(item.id);

    return item.elements.map((element) => {
        const clone = structuredClone(element) as TemplateElement & {
            id: string;
            seed: number;
            version: number;
            versionNonce: number;
            groupIds: string[];
            boundElements: unknown[];
            updated?: number;
            link?: string | null;
            locked?: boolean;
        };
        clone.id = randomId(item.id);
        clone.seed = randomSeed();
        clone.version = 1;
        clone.versionNonce = randomSeed();
        clone.isDeleted = false;
        clone.x = element.x + offsetX;
        clone.y = element.y + offsetY;
        clone.groupIds = [groupId];
        clone.boundElements = [];
        clone.updated = Date.now();
        clone.link = null;
        clone.locked = false;
        return clone;
    });
}

interface EventStormingProps {
    showExportPreview?: boolean;
}

export function EventStorming({ showExportPreview = false }: EventStormingProps) {
    const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);
    const suppressLibraryReset = useRef(false);
    const [sceneExport, setSceneExport] = useState<string>(
        "// Interact with the canvas to update the export preview",
    );

    const setExcalidrawRef = useCallback((api: ExcalidrawImperativeAPI | null) => {
        excalidrawRef.current = api;
    }, []);

    const handleLibraryChange = useCallback((items: LibraryItems) => {
        if (suppressLibraryReset.current) {
            suppressLibraryReset.current = false;
            return;
        }
        if (createLibrarySignature(items) !== ALLOWED_LIBRARY_SIGNATURE) {
            const api = excalidrawRef.current;
            if (!api) return;
            suppressLibraryReset.current = true;
            void api
                .updateLibrary({
                    libraryItems: () => getFreshLibraryItems(),
                    merge: false,
                    prompt: false,
                    defaultStatus: "unpublished",
                })
                .catch(() => {
                    // ignore, we'll retry on the next change event
                });
        }
    }, []);

    const initialData = useMemo<ExcalidrawInitialDataState>(() => ({
        libraryItems: cloneLibraryItems(BASE_LIBRARY_ITEMS),
    }), []);

    const handleSceneChange = useCallback(
        (elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
            if (!showExportPreview) return;
            try {
                const serialized = serializeAsJSON(elements, appState, files, "local");
                setSceneExport(serialized);
            } catch (error) {
                console.error("Failed to serialize EventStorming scene", error);
            }
        },
        [showExportPreview],
    );

    const insertItem = useCallback((itemId: DddLibraryItemId) => {
        const api = excalidrawRef.current;
        if (!api) return;
        const template = BASE_LIBRARY_ITEMS.find((item) => item.id === itemId);
        if (!template) return;

        const appState = api.getAppState();
        const clones = cloneLibraryItemElements(template, appState);
        const selectedElementIds = clones.reduce<Record<string, true>>((acc, element) => {
            acc[element.id] = true;
            return acc;
        }, {});

        const currentElements = api.getSceneElements();
        const currentAppState = api.getAppState();

        api.updateScene({
            elements: [...currentElements, ...clones],
            appState: {
                ...currentAppState,
                selectedElementIds,
            },
        });
    }, []);

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <header style={{ marginBottom: 16 }}>
                <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 8 }}>
                    EventStorming Canvas
                </Typography.Title>
                <Typography.Paragraph style={{ marginBottom: 12 }}>
                    Drop curated DDD building blocks onto the canvas. Only the provided library items are allowed to keep the board consistent.
                </Typography.Paragraph>
                <Space wrap>
                    {DDD_LIBRARY_CONFIG.map((item) => (
                        <Tooltip key={item.id} title={item.description} placement="top">
                            <Button
                                size="large"
                                onClick={() => insertItem(item.id)}
                                style={{
                                    backgroundColor: item.fill,
                                    borderColor: item.stroke,
                                    color: item.text,
                                    fontWeight: 600,
                                }}
                            >
                                {item.label}
                            </Button>
                        </Tooltip>
                    ))}
                </Space>
            </header>
            <div style={{ flex: 1, minHeight: 480 }}>
                <Excalidraw
                    ref={setExcalidrawRef}
                    initialData={initialData}
                    onLibraryChange={handleLibraryChange}
                    onChange={handleSceneChange}
                    UIOptions={{
                        tools: {
                            image: false,
                            frame: false,
                            hand: false,
                            text: false,
                            arrow: false,
                            line: false,
                            rectangle: false,
                            diamond: false,
                            ellipse: false,
                            freedraw: false,
                            eraser: false,
                        },
                    }}
                />
            </div>
            {showExportPreview && (
                <Card
                    size="small"
                    style={{ marginTop: 24, maxHeight: 320, overflow: "auto" }}
                    styles={{
                        body: {
                            fontFamily: "ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace",
                            whiteSpace: "pre",
                            fontSize: 12,
                        },
                    }}
                >
                    {sceneExport}
                </Card>
            )}
        </div>
    );
}
