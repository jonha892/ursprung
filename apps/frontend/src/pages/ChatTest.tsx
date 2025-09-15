import { Chat } from "../components/Chat.tsx";
import OpenAI from "npm:openai";
import { Agent, run, setDefaultOpenAIClient, tool } from "@openai/agents";
import React from "react";
import { create } from "node:domain";
import { createStepAgent } from "../config/agentFactory.ts";
import { createNewProject, DddProject, DddStepKind } from "shared/ddd_project.ts";

export default function ChatTest() {
    const [testText, setTestText] = React.useState("Initial text");

    const setTextTool = tool({
        name: "set_text",
        description: "Set the text to a specific value",

        // REQUIRED when you pass raw JSON Schema:
        strict: true,

        parameters: {
            type: "object",
            properties: {
                text: { type: "string", description: "The text to set the value to" },
            },
            required: ["text"],
            additionalProperties: false, // required in strict mode
        },

        // deno-lint-ignore no-explicit-any
        execute: (input: any) => {
            setTestText(input.text);
            return { ok: true };
        },
    });

    const api_key = "abxcdefghijklmnopqrstuvwxyz0123456789"; // Replace with your OpenAI API key

    const agent = createStepAgent(api_key, DddStepKind.VisionScope, [setTextTool]);

    const project = createNewProject("test project", "testId", "A test project for the Chat component");

    return (
        <div
            style={{
                padding: "96px 32px 32px",
                maxWidth: 1000,
                margin: "0 auto",
                display: "flex",
                justifyContent: "center",
            }}
        >
            <p>{testText}</p>
            <Chat agent={agent} height={500} project={project} />
        </div>
    );
}
