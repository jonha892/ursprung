import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App as AntApp, Button, Input, Popconfirm, Space, Switch, Tag, theme, Tooltip, Typography } from "antd";
import { DeleteOutlined, HolderOutlined, PlusOutlined } from "@ant-design/icons";
import { DndContext, type DragEndEvent, PointerSensor, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useNavigate } from "react-router-dom";
import { StepEditLayout } from "./StepEditLayout.tsx";
import { Chat } from "./Chat.tsx";
import { useProjectStore } from "../stores/projectStore.ts";
import { useApiKeyStore } from "../stores/apiKeyStore.ts";
import { createStepAgent } from "../config/agentFactory.ts";
import {
    type DddProject,
    DddStepKind,
    DEFAULT_MINI_EVENT_STORMING_LANES,
    type MiniEventStormingCard,
    type MiniEventStormingCardType,
    type MiniEventStormingContent,
    type MiniEventStormingLane,
} from "../../../../packages/shared/ddd_project.ts";

const { Text } = Typography;

type BoardState = {
    lanes: MiniEventStormingLane[];
    cards: MiniEventStormingCard[];
};

type CardTypeTheme = {
    label: string;
    color: string;
    background: string;
    placeholder: string;
};

const CARD_TYPE_META: Record<MiniEventStormingCardType, CardTypeTheme> = {
    domain_event: {
        label: "Domain Event",
        color: "#ea580c",
        background: "#fef3c7",
        placeholder: "InvoiceSent, PaymentReceived, ReminderScheduled ...",
    },
    command: {
        label: "Command",
        color: "#2563eb",
        background: "#dbeafe",
        placeholder: "SendInvoice, RetryPayment, ApproveRefund ...",
    },
    policy: {
        label: "Policy / Regel",
        color: "#7c3aed",
        background: "#ede9fe",
        placeholder: "Wenn Zahlung ausbleibt 3 Tage → Erinnerung senden",
    },
    external_system: {
        label: "Externes System",
        color: "#92400e",
        background: "#fef6e4",
        placeholder: "PaymentProvider, CRM, EmailGateway ...",
    },
    question: {
        label: "Frage / Hot Spot",
        color: "#e11d48",
        background: "#ffe4e6",
        placeholder: "Wie gehen wir mit Stornos um? Wer ist Eigentümer?",
    },
};

const AUTOSAVE_TOAST_KEY = "mini-event-storming-autosave";

function cloneLanes(lanes?: MiniEventStormingLane[]): MiniEventStormingLane[] {
    const source = lanes && lanes.length > 0 ? lanes : DEFAULT_MINI_EVENT_STORMING_LANES;
    return source.map((lane) => ({ ...lane }));
}

function normalizeCardsForLanes(
    lanes: MiniEventStormingLane[],
    cards?: MiniEventStormingCard[],
): MiniEventStormingCard[] {
    if (!cards || cards.length === 0) {
        return [];
    }

    const grouped = new Map<string, MiniEventStormingCard[]>();
    for (const card of cards) {
        const copy = { ...card };
        const bucket = grouped.get(copy.laneId);
        if (bucket) {
            bucket.push(copy);
        } else {
            grouped.set(copy.laneId, [copy]);
        }
    }

    const ordered: MiniEventStormingCard[] = [];
    for (const lane of lanes) {
        const laneCards = grouped.get(lane.id);
        if (!laneCards) continue;

        laneCards
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .forEach((card, index) => {
                ordered.push({
                    ...card,
                    laneId: lane.id,
                    type: lane.category,
                    order: index,
                });
            });
        grouped.delete(lane.id);
    }

    // Preserve cards that reference unknown lanes at the end so older data is not lost
    grouped.forEach((laneCards, laneId) => {
        laneCards
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .forEach((card, index) => {
                ordered.push({
                    ...card,
                    laneId,
                    order: index,
                });
            });
    });

    return ordered;
}

function createBoardState(content: MiniEventStormingContent | undefined): BoardState {
    const lanes = cloneLanes(content?.lanes);
    const cards = normalizeCardsForLanes(lanes, content?.cards);
    return { lanes, cards };
}

function buildContent(board: BoardState, completed: boolean): MiniEventStormingContent {
    return {
        kind: DddStepKind.MiniEventStorming,
        completed,
        updatedAt: new Date().toISOString(),
        lanes: board.lanes.map((lane) => ({ ...lane })),
        cards: normalizeCardsForLanes(board.lanes, board.cards),
    };
}

interface MiniEventStormingEditProps {
    project: DddProject;
}

export function MiniEventStormingEdit({ project }: MiniEventStormingEditProps) {
    const { notification, message } = AntApp.useApp();
    const updateProject = useProjectStore((s) => s.updateProject);
    const { getSelectedApiKey } = useApiKeyStore();
    const selectedApiKey = getSelectedApiKey();
    const agent = selectedApiKey ? createStepAgent(selectedApiKey.key, DddStepKind.MiniEventStorming) : null;
    const nav = useNavigate();
    const editCardRef = useRef<HTMLDivElement | null>(null);

    const stepContent = project.content[DddStepKind.MiniEventStorming] as MiniEventStormingContent;
    const [boardState, setBoardState] = useState<BoardState>(() => createBoardState(stepContent));
    const [completed, setCompleted] = useState<boolean>(stepContent.completed);
    const boardStateRef = useRef(boardState);
    const completedRef = useRef(completed);
    const pendingContentRef = useRef<MiniEventStormingContent | null>(null);
    const saveTimeoutRef = useRef<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        boardStateRef.current = boardState;
    }, [boardState]);
    useEffect(() => {
        completedRef.current = completed;
    }, [completed]);

    useEffect(() => {
        setBoardState(createBoardState(stepContent));
        setCompleted(stepContent.completed);
    }, [stepContent.updatedAt]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
    );

    const saveContent = useCallback(
        async (content: MiniEventStormingContent) => {
            setIsSaving(true);
            try {
                const updatedProject = {
                    ...project,
                    content: {
                        ...project.content,
                        [DddStepKind.MiniEventStorming]: content,
                    },
                    updatedAt: new Date().toISOString(),
                };
                await updateProject(updatedProject);
                return true;
            } catch (error) {
                console.error("Failed to save Mini-Event-Storming:", error);
                message.error("Fehler beim Speichern");
                return false;
            } finally {
                setIsSaving(false);
            }
        },
        [message, project, updateProject],
    );

    const runPendingSave = useCallback(
        async (showToast = true) => {
            if (saveTimeoutRef.current) {
                globalThis.clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
            if (!pendingContentRef.current) return;

            const contentToSave = pendingContentRef.current;
            pendingContentRef.current = null;
            const ok = await saveContent(contentToSave);
            if (ok && showToast) {
                notification.success({
                    key: AUTOSAVE_TOAST_KEY,
                    message: "Automatisch gespeichert",
                    placement: "bottomRight",
                    duration: 1.5,
                });
            }
        },
        [notification, saveContent],
    );

    const queueSave = useCallback(
        (nextBoard: BoardState, nextCompleted: boolean) => {
            pendingContentRef.current = buildContent(nextBoard, nextCompleted);
            if (saveTimeoutRef.current) {
                globalThis.clearTimeout(saveTimeoutRef.current);
            }
            saveTimeoutRef.current = globalThis.setTimeout(() => {
                void runPendingSave();
            }, 1200);
        },
        [runPendingSave],
    );

    const updateBoard = useCallback(
        (recipe: (prev: BoardState) => BoardState | null) => {
            setBoardState((prev) => {
                const result = recipe(prev);
                if (!result) {
                    return prev;
                }
                const normalized: BoardState = {
                    lanes: result.lanes,
                    cards: normalizeCardsForLanes(result.lanes, result.cards),
                };
                queueSave(normalized, completedRef.current);
                return normalized;
            });
        },
        [queueSave],
    );

    useEffect(() => {
        return () => {
            void runPendingSave(false);
        };
    }, [runPendingSave]);

    const handleAddCard = useCallback(
        (lane: MiniEventStormingLane) => {
            updateBoard((prev) => {
                const nextCard: MiniEventStormingCard = {
                    id: crypto.randomUUID(),
                    laneId: lane.id,
                    type: lane.category,
                    text: "",
                    order: prev.cards.filter((card) => card.laneId === lane.id).length,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                return {
                    lanes: prev.lanes,
                    cards: [...prev.cards, nextCard],
                };
            });
        },
        [updateBoard],
    );

    const handleCardTextChange = useCallback(
        (cardId: string, value: string) => {
            updateBoard((prev) => {
                const index = prev.cards.findIndex((card) => card.id === cardId);
                if (index === -1) return null;
                const existing = prev.cards[index];
                if (existing.text === value) return null;
                const updated: MiniEventStormingCard = {
                    ...existing,
                    text: value,
                    updatedAt: new Date().toISOString(),
                };
                const nextCards = [...prev.cards];
                nextCards[index] = updated;
                return { lanes: prev.lanes, cards: nextCards };
            });
        },
        [updateBoard],
    );

    const handleDeleteCard = useCallback(
        (cardId: string) => {
            updateBoard((prev) => {
                if (!prev.cards.some((card) => card.id === cardId)) return null;
                return {
                    lanes: prev.lanes,
                    cards: prev.cards.filter((card) => card.id !== cardId),
                };
            });
        },
        [updateBoard],
    );

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over) return;

            const activeId = String(active.id);
            const overId = String(over.id);
            if (activeId === overId) return;

            updateBoard((prev) => {
                const activeCard = prev.cards.find((card) => card.id === activeId);
                if (!activeCard) return null;

                const isLaneTarget = prev.lanes.some((lane) => lane.id === overId);
                const overCard = isLaneTarget ? null : prev.cards.find((card) => card.id === overId);
                const targetLaneId = isLaneTarget ? overId : overCard?.laneId ?? activeCard.laneId;
                if (!targetLaneId) return null;

                if (targetLaneId === activeCard.laneId) {
                    const laneCards = prev.cards
                        .filter((card) => card.laneId === activeCard.laneId)
                        .sort((a, b) => a.order - b.order);
                    const oldIndex = laneCards.findIndex((card) => card.id === activeId);
                    let newIndex = laneCards.findIndex((card) => card.id === (overCard?.id ?? activeId));
                    if (isLaneTarget) {
                        newIndex = laneCards.length - 1;
                    }
                    if (newIndex === -1) {
                        newIndex = laneCards.length - 1;
                    }
                    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
                        return null;
                    }
                    const reordered = arrayMove(laneCards, oldIndex, newIndex);
                    const otherCards = prev.cards.filter((card) => card.laneId !== activeCard.laneId);
                    return {
                        lanes: prev.lanes,
                        cards: [...otherCards, ...reordered],
                    };
                }

                const sourceLaneId = activeCard.laneId;
                const targetLane = prev.lanes.find((lane) => lane.id === targetLaneId);
                const withoutActive = prev.cards.filter((card) => card.id !== activeId);
                const sourceCards = withoutActive.filter((card) => card.laneId === sourceLaneId);
                const targetCards = withoutActive.filter((card) => card.laneId === targetLaneId);
                let insertionIndex = targetCards.length;
                if (!isLaneTarget) {
                    const index = targetCards.findIndex((card) => card.id === overId);
                    insertionIndex = index === -1 ? targetCards.length : index;
                }
                const before = targetCards.slice(0, insertionIndex);
                const after = targetCards.slice(insertionIndex);
                const moved: MiniEventStormingCard = {
                    ...activeCard,
                    laneId: targetLaneId,
                    type: targetLane?.category ?? activeCard.type,
                    updatedAt: new Date().toISOString(),
                };
                const otherCards = withoutActive.filter(
                    (card) => card.laneId !== sourceLaneId && card.laneId !== targetLaneId,
                );
                return {
                    lanes: prev.lanes,
                    cards: [...otherCards, ...sourceCards, ...before, moved, ...after],
                };
            });
        },
        [updateBoard],
    );

    const handleCompletedChange = useCallback(
        (checked: boolean) => {
            setCompleted(checked);
            queueSave(boardStateRef.current, checked);
        },
        [queueSave],
    );

    const handleManualSave = useCallback(async () => {
        const content = pendingContentRef.current ?? buildContent(boardStateRef.current, completedRef.current);
        pendingContentRef.current = null;
        if (saveTimeoutRef.current) {
            globalThis.clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
        const ok = await saveContent(content);
        if (ok) {
            notification.success({
                message: "Gespeichert",
                placement: "bottomRight",
                duration: 1.8,
            });
        }
    }, [notification, saveContent]);

    const handleBack = useCallback(() => {
        nav(`/projects/${project.id}`);
    }, [nav, project.id]);

    const cardsByLane = useMemo(() => {
        const map = new Map<string, MiniEventStormingCard[]>();
        for (const lane of boardState.lanes) {
            map.set(lane.id, []);
        }
        for (const card of boardState.cards) {
            const bucket = map.get(card.laneId);
            if (bucket) {
                bucket.push(card);
            } else {
                map.set(card.laneId, [card]);
            }
        }
        for (const lane of boardState.lanes) {
            const bucket = map.get(lane.id);
            if (bucket) {
                bucket.sort((a, b) => a.order - b.order);
            }
        }
        return map;
    }, [boardState]);

    return (
        <StepEditLayout
            project={project}
            stepKind={DddStepKind.MiniEventStorming}
            completed={completed}
            editCardRef={editCardRef}
            onBack={handleBack}
            onSubmit={handleManualSave}
            isSubmitting={isSaving}
            chat={<Chat agent={agent} project={project} height={380} />}
            layout="stacked"
        >
            <MiniEventStormingBoard
                board={boardState}
                cardsByLane={cardsByLane}
                onAddCard={handleAddCard}
                onCardChange={handleCardTextChange}
                onDeleteCard={handleDeleteCard}
                onDragEnd={handleDragEnd}
                sensors={sensors}
                completed={completed}
                onCompletedChange={handleCompletedChange}
            />
        </StepEditLayout>
    );
}

interface MiniEventStormingBoardProps {
    board: BoardState;
    cardsByLane: Map<string, MiniEventStormingCard[]>;
    onAddCard: (lane: MiniEventStormingLane) => void;
    onCardChange: (cardId: string, value: string) => void;
    onDeleteCard: (cardId: string) => void;
    onDragEnd: (event: DragEndEvent) => void;
    sensors: ReturnType<typeof useSensors>;
    completed: boolean;
    onCompletedChange: (checked: boolean) => void;
}

function MiniEventStormingBoard({
    board,
    cardsByLane,
    onAddCard,
    onCardChange,
    onDeleteCard,
    onDragEnd,
    sensors,
    completed,
    onCompletedChange,
}: MiniEventStormingBoardProps) {
    const { token } = theme.useToken();

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 16,
                }}
            >
                <Space size={24} wrap>
                    {Object.entries(CARD_TYPE_META).map(([type, meta]) => (
                        <div key={type} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                                style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: 3,
                                    backgroundColor: meta.color,
                                    display: "inline-block",
                                }}
                            />
                            <Text style={{ color: token.colorTextSecondary }}>{meta.label}</Text>
                        </div>
                    ))}
                </Space>
                <Space size={12}>
                    <Switch
                        checked={completed}
                        onChange={onCompletedChange}
                        checkedChildren="Abgeschlossen"
                        unCheckedChildren="In Bearbeitung"
                    />
                </Space>
            </div>

            <DndContext sensors={sensors} onDragEnd={onDragEnd}>
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                    {board.lanes.map((lane) => (
                        <MiniEventStormingLaneRow
                            key={lane.id}
                            lane={lane}
                            cards={cardsByLane.get(lane.id) ?? []}
                            onAddCard={onAddCard}
                            onCardChange={onCardChange}
                            onDeleteCard={onDeleteCard}
                        />
                    ))}
                </div>
            </DndContext>
        </div>
    );
}

interface MiniEventStormingLaneRowProps {
    lane: MiniEventStormingLane;
    cards: MiniEventStormingCard[];
    onAddCard: (lane: MiniEventStormingLane) => void;
    onCardChange: (cardId: string, value: string) => void;
    onDeleteCard: (cardId: string) => void;
}

function MiniEventStormingLaneRow({ lane, cards, onAddCard, onCardChange, onDeleteCard }: MiniEventStormingLaneRowProps) {
    const meta = CARD_TYPE_META[lane.category];
    const { token } = theme.useToken();
    const { isOver, setNodeRef } = useDroppable({ id: lane.id });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                }}
            >
                <div>
                    <Text strong style={{ color: token.colorText, fontSize: 16 }}>
                        {lane.title}
                    </Text>
                    {lane.description && (
                        <div>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                {lane.description}
                            </Text>
                        </div>
                    )}
                </div>
                <Space size={12}>
                    <Tag
                        color={meta.color}
                        style={{ margin: 0, backgroundColor: meta.background, border: `1px solid ${meta.color}` }}
                    >
                        {cards.length}
                    </Tag>
                    <Button
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => onAddCard(lane)}
                        type="dashed"
                    >
                        Neue Notiz
                    </Button>
                </Space>
            </div>

            <div
                ref={setNodeRef}
                style={{
                    padding: 12,
                    borderRadius: 12,
                    border: `1px dashed ${isOver ? meta.color : token.colorBorderSecondary}`,
                    backgroundColor: isOver ? meta.background : token.colorFillTertiary,
                    minHeight: 180,
                    overflowX: "auto",
                }}
            >
                <SortableContext
                    items={cards.map((card) => card.id)}
                    strategy={horizontalListSortingStrategy}
                >
                    <div style={{ display: "flex", gap: 16, minHeight: 150 }}>
                        {cards.map((card) => (
                            <MiniEventStormingCardSticky
                                key={card.id}
                                card={card}
                                meta={meta}
                                onChange={onCardChange}
                                onDelete={onDeleteCard}
                            />
                        ))}
                    </div>
                </SortableContext>
                {cards.length === 0 && (
                    <div
                        style={{
                            marginTop: 12,
                            color: token.colorTextSecondary,
                            fontSize: 13,
                        }}
                    >
                        Karten hierher ziehen oder oben auf "Neue Notiz" klicken.
                    </div>
                )}
            </div>
        </div>
    );
}

interface MiniEventStormingCardStickyProps {
    card: MiniEventStormingCard;
    meta: CardTypeTheme;
    onChange: (cardId: string, value: string) => void;
    onDelete: (cardId: string) => void;
}

function MiniEventStormingCardSticky({ card, meta, onChange, onDelete }: MiniEventStormingCardStickyProps) {
    const { token } = theme.useToken();
    const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 12 : undefined,
    } as const;

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        onChange(card.id, event.target.value);
    };

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                width: 220,
                minHeight: 150,
                backgroundColor: meta.background,
                borderRadius: 14,
                border: `1px solid ${meta.color}`,
                boxShadow: "0 12px 20px rgba(15, 23, 42, 0.12)",
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 12,
            }}
        >
            <Input.TextArea
                value={card.text}
                onChange={handleChange}
                autoSize={{ minRows: 3, maxRows: 6 }}
                variant="borderless"
                placeholder={meta.placeholder}
                style={{
                    background: "transparent",
                    fontWeight: 500,
                    fontSize: 16,
                    color: token.colorText,
                    padding: 0,
                }}
            />
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <Tag
                    color={meta.color}
                    style={{
                        margin: 0,
                        backgroundColor: meta.color,
                        color: "#fff",
                        borderRadius: 6,
                        border: "none",
                        fontSize: 12,
                    }}
                >
                    {meta.label}
                </Tag>
                <Space size={4}>
                    <Tooltip title="Ziehen">
                        <Button
                            type="text"
                            size="small"
                            icon={<HolderOutlined />}
                            {...listeners}
                            {...attributes}
                            style={{ cursor: "grab", color: token.colorTextSecondary }}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Notiz löschen?"
                        okText="Löschen"
                        cancelText="Abbrechen"
                        placement="topRight"
                        onConfirm={() => onDelete(card.id)}
                    >
                        <Tooltip title="Löschen">
                            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            </div>
        </div>
    );
}
