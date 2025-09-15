import { Agent, run, tool, setDefaultOpenAIClient } from "@openai/agents";
import OpenAI from "npm:openai";
import { DddProject, DddStepKind } from "../../../../packages/shared/ddd_project.ts";
import { getAgentInstructions } from "./agentPrompts.ts";

export interface StepAgent {
  name: string;
  invoke: (message: string, project: DddProject) => Promise<string>;
}

/**
 * Creates an agent for a specific DDD step with custom tools.
 * 
 * @param apiKey - OpenAI API key
 * @param stepKind - The DDD step this agent should help with
 * @param tools - Array of tools created with the tool() function from @openai/agents
 * @returns StepAgent wrapper for the OpenAI agent
 */
export function createStepAgent(
  apiKey: string,
  stepKind: DddStepKind,
  tools: ReturnType<typeof tool>[] = []
): StepAgent {
  const client = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true, // Required for browser use
  });
  
  // @ts-ignore - OpenAI client version compatibility
  setDefaultOpenAIClient(client);
  

  const agent = new Agent({
    name: `DDD ${stepKind} Assistant`,
    tools: tools,
    instructions: getAgentInstructions(stepKind),
    model: "gpt-5",
  });

  return {
    name: agent.name,
    invoke: async (message: string, project: DddProject): Promise<string> => {
      try {
        const enrichedMessage = `Project Context:\n${JSON.stringify(project, null, 2)}\n\nUser Message:\n${message}`;

        const result = await run(agent, enrichedMessage, {});
        return result.finalOutput || "Entschuldigung, ich konnte keine Antwort generieren.";
      } catch (error) {
        console.error(`DDD ${stepKind} Agent Error:`, error);
        return "Es ist ein Fehler bei der Kommunikation mit dem AI-Assistant aufgetreten. Bitte versuchen Sie es erneut.";
      }
    }
  };
}