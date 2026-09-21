import { GoogleGenAI, Type } from "@google/genai";
import { LAB_JOURNAL } from "../constants";
import { ImplementationPlan, LabSpecs } from "../types";

const getAI = (userKey?: string) => {
  const key = userKey || process.env.GEMINI_API_KEY || "";
  if (!key) {
    throw new Error("Missing Gemini API Key. Please provide one in your settings.");
  }
  return new GoogleGenAI({ apiKey: key });
};

export async function hardwareFeasibilityCheck(newIdea: string, specs: LabSpecs, userApiKey?: string) {
  const specsStr = specs.map(s => `${s.label}: ${s.value}`).join('\n');
  const ai = getAI(userApiKey);
  const systemInstruction = `
    You are the Senior Research Engineer for a high-end AI home lab. 
    Your hardware configuration is:
    ${specsStr}
    
    CRITICAL CONSTRAINTS:
    1. Analyze the idea based on the specific hardware provided above.
    2. Refer to the 'Lab Journal' to suggest iterative improvements.
    
    LAB JOURNAL (Past Experiments):
    ${JSON.stringify(LAB_JOURNAL, null, 2)}

    Return your analysis in a structured JSON format.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Analyze this idea: ${newIdea}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          feasibility: {
            type: Type.STRING,
            enum: ["PASS", "FAIL", "CONDITIONAL"],
            description: "The overall feasibility of the project."
          },
          reasoning: {
            type: Type.STRING,
            description: "Detailed explanation of the feasibility assessment."
          },
          suggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Iterative improvements or suggestions based on past experiments."
          }
        },
        required: ["feasibility", "reasoning", "suggestions"]
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from AI");
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI response:", e);
    throw new Error("Invalid response from AI", { cause: e });
  }
}

export async function generateImplementationPlan(researchIdea: string, specs: LabSpecs, userApiKey?: string): Promise<ImplementationPlan> {
  const specsStr = specs.map(s => `${s.label}: ${s.value}`).join('\n');
  const ai = getAI(userApiKey);
  const systemInstruction = `
    You are the Lead Implementation Architect for a high-end AI home lab.
    Your hardware configuration is:
    ${specsStr}

    YOUR TASK:
    1. Research the provided AI idea/paper using Google Search to find official implementations, GitHub repositories, datasets, and related open-source projects.
    2. Create a comprehensive, step-by-step implementation plan that an AI coding agent (Claude Code) can execute autonomously in this specific lab environment.
    3. Ensure all recommendations account for the exact hardware specs provided — include memory budgets, batch sizes, quantization levels, and storage paths where relevant.
    4. The agent_instructions field must be a complete, self-contained task brief for Claude Code. Write it as if handing off to a senior engineer who knows nothing about the plan context. Include:
       - Exact environment setup commands (conda/pip/docker)
       - Required model checkpoints with download commands or huggingface IDs
       - File structure to create
       - Key configuration values tuned for the lab hardware
       - Any NFS/SMB mount paths or network storage considerations
       - How to validate the experiment is working (test commands, expected outputs)
       - How to clean up or tear down if needed

    LAB JOURNAL (Past Context — use to avoid repeating past mistakes and build on successes):
    ${JSON.stringify(LAB_JOURNAL, null, 2)}

    Return the plan in a structured JSON format.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Create a lab implementation plan for: ${researchIdea}`,
    config: {
      systemInstruction,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          git_resources: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                url: { type: Type.STRING }
              },
              required: ["name", "url"]
            }
          },
          architecture_recommendation: { type: Type.STRING },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phase: { type: Type.STRING },
                tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
                hardware_considerations: { type: Type.STRING }
              },
              required: ["phase", "tasks", "hardware_considerations"]
            }
          },
          agent_instructions: { type: Type.STRING, description: "Specific prompt/instructions for an AI coding agent to execute this plan." }
        },
        required: ["title", "summary", "git_resources", "architecture_recommendation", "steps", "agent_instructions"]
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from AI");
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse implementation plan:", e);
    throw new Error("Invalid response from AI", { cause: e });
  }
}
