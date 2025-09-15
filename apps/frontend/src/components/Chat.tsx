import { FC, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Avatar, Card, Input, Space, Spin, theme, Typography } from "antd";
import { RobotOutlined, SendOutlined, UserOutlined } from "@ant-design/icons";
import { StepAgent } from "../config/agentFactory.ts";
import { DddProject } from "shared/ddd_project.ts";

const { Text } = Typography;
const { TextArea } = Input;

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

export interface ChatProps {
    agent: StepAgent | null;
    project: DddProject;
    height?: number;
}

export const Chat: FC<ChatProps> = ({ agent, project, height = 400 }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const { token } = theme.useToken();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        const trimmedInput = inputValue.trim();
        if (!trimmedInput || isLoading || !agent) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: trimmedInput,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);

        try {
            const response = await agent.invoke(trimmedInput, project);
            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: response,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (_error) {
            console.error("Error invoking agent:", _error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            textAreaRef.current?.focus();
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <Card
            title={`Chat mit ${agent?.name || "AI Assistent"}`}
            style={{ height: height + 60 }}
            styles={{
                body: { height: height, padding: 0, display: "flex", flexDirection: "column" },
            }}
        >
            <div style={{ display: "flex", flexDirection: "column", height }}>
                {/* No Agent State */}
                {!agent
                    ? (
                        <div
                            style={{
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                textAlign: "center",
                                padding: "32px 16px",
                                color: token.colorTextSecondary,
                            }}
                        >
                            <div>
                                <RobotOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
                                <div>
                                    <Text type="secondary">
                                        Bitte einen OpenAI API Key hinzufügen :)
                                    </Text>
                                </div>
                            </div>
                        </div>
                    )
                    : (
                        <>
                            {/* Messages Area */}
                            <div
                                style={{
                                    flex: 1,
                                    overflowY: "auto",
                                    padding: "16px",
                                    borderBottom: `1px solid ${token.colorBorder}`,
                                    marginBottom: 0,
                                }}
                            >
                                {messages.length === 0
                                    ? (
                                        <div
                                            style={{
                                                textAlign: "center",
                                                color: token.colorTextSecondary,
                                                padding: "32px 16px",
                                            }}
                                        >
                                            <Text type="secondary">
                                                Starten Sie eine Unterhaltung mit dem AI Assistenten
                                            </Text>
                                        </div>
                                    )
                                    : (
                                        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                                            {messages.map((message) => (
                                                <div
                                                    key={message.id}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "flex-start",
                                                        gap: 12,
                                                        ...(message.role === "user" && {
                                                            flexDirection: "row-reverse",
                                                        }),
                                                    }}
                                                >
                                                    <Avatar
                                                        icon={message.role === "user" ? <UserOutlined /> : <RobotOutlined />}
                                                        style={{
                                                            backgroundColor: message.role === "user" ? token.colorPrimary : token.colorSuccess,
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                    <div
                                                        style={{
                                                            maxWidth: "70%",
                                                            ...(message.role === "user" && {
                                                                textAlign: "right",
                                                            }),
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                padding: "8px 12px",
                                                                borderRadius: 12,
                                                                backgroundColor: message.role === "user" ? token.colorPrimary : token.colorFillSecondary,
                                                                color: message.role === "user" ? "#fff" : token.colorText,
                                                                whiteSpace: "pre-wrap",
                                                                wordBreak: "break-word",
                                                            }}
                                                        >
                                                            {message.content}
                                                        </div>
                                                        <Text
                                                            type="secondary"
                                                            style={{
                                                                fontSize: 11,
                                                                marginTop: 4,
                                                                display: "block",
                                                            }}
                                                        >
                                                            {formatTime(message.timestamp)}
                                                        </Text>
                                                    </div>
                                                </div>
                                            ))}
                                            {isLoading && (
                                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                    <Avatar
                                                        icon={<RobotOutlined />}
                                                        style={{
                                                            backgroundColor: token.colorSuccess,
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                    <div
                                                        style={{
                                                            padding: "8px 12px",
                                                            borderRadius: 12,
                                                            backgroundColor: token.colorFillSecondary,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 8,
                                                        }}
                                                    >
                                                        <Spin size="small" />
                                                        <Text type="secondary">Schreibt...</Text>
                                                    </div>
                                                </div>
                                            )}
                                        </Space>
                                    )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", padding: "16px" }}>
                                <TextArea
                                    ref={textAreaRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Nachricht eingeben... (Enter zum Senden, Shift+Enter für neue Zeile)"
                                    autoSize={{ minRows: 2, maxRows: 4 }}
                                    disabled={isLoading || !agent}
                                    style={{
                                        flex: 1,
                                        borderRadius: 6,
                                    }}
                                />
                                <div
                                    style={{
                                        padding: "4px 8px",
                                        cursor: inputValue.trim() && !isLoading && agent ? "pointer" : "not-allowed",
                                        color: inputValue.trim() && !isLoading && agent ? token.colorPrimary : token.colorTextDisabled,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        minHeight: 32,
                                    }}
                                    onClick={handleSendMessage}
                                >
                                    <SendOutlined style={{ fontSize: 16 }} />
                                </div>
                            </div>
                        </>
                    )}
            </div>
        </Card>
    );
};
