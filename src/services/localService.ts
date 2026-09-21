import { LAB_JOURNAL } from "../constants";
import { AnalysisResult, ImplementationPlan, LabSpecs } from "../types";

function extractJSON(text: string): string {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return text.trim();
}

async function callLocalModel(messages: { role: string; content: string }[]): Promise<string> {
  const token = localStorage.getItem('oracle_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch('/api/local-ai', {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Local model request failed' }));
    throw new Error(err.error || 'Local model request failed');
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function hardwareFeasibilityCheckLocal(newIdea: string, specs: LabSpecs): Promise<AnalysisResult> {
  const specsStr = specs.map(s => `${s.label}: ${s.value}`).join('\n');

  const systemPrompt = `You are a hardware feasibility analyst for an AI home lab.
Lab hardware:
${specsStr}

Past experiments for context:
${JSON.stringify(LAB_JOURNAL, null, 2)}

You MUST respond with ONLY a valid JSON object. No explanation, no markdown, no code fences.
Use this exact structure:
{"feasibility":"PASS","reasoning":"your reasoning here","suggestions":["suggestion 1","suggestion 2"]}
feasibility must be exactly one of: PASS, FAIL, CONDITIONAL`;

  const content = await callLocalModel([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Analyze feasibility for my AI home lab: ${newIdea}` },
  ]);

  try {
    const parsed = JSON.parse(extractJSON(content));
    if (!['PASS', 'FAIL', 'CONDITIONAL'].includes(parsed.feasibility)) {
      throw new Error('Invalid feasibility value');
    }
    return {
      feasibility: parsed.feasibility,
      reasoning: parsed.reasoning || 'No reasoning provided.',
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch {
    throw new Error('Local model returned an unparseable response. Try again or switch to Gemini.');
  }
}

export async function generateImplementationPlanLocal(researchIdea: string, specs: LabSpecs): Promise<ImplementationPlan> {
  const specsStr = specs.map(s => `${s.label}: ${s.value}`).join('\n');

  const systemPrompt = `You are an implementation architect for an AI home lab.
Lab hardware:
${specsStr}

You MUST respond with ONLY a valid JSON object. No explanation, no markdown, no code fences.
Use this exact structure:
{"title":"Plan title","summary":"Brief summary","git_resources":[{"name":"repo name","url":"https://github.com/..."}],"architecture_recommendation":"Architecture details","steps":[{"phase":"Phase name","tasks":["task 1","task 2"],"hardware_considerations":"Memory/compute notes"}],"agent_instructions":"Full instructions for Claude Code to execute this plan"}`;

  const content = await callLocalModel([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Create a step-by-step implementation plan for my AI home lab: ${researchIdea}` },
  ]);

  try {
    const parsed = JSON.parse(extractJSON(content));
    return {
      title: parsed.title || 'Implementation Plan',
      summary: parsed.summary || '',
      git_resources: Array.isArray(parsed.git_resources) ? parsed.git_resources : [],
      architecture_recommendation: parsed.architecture_recommendation || '',
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      agent_instructions: parsed.agent_instructions || '',
    };
  } catch {
    throw new Error('Local model returned an unparseable response. Try again or switch to Gemini.');
  }
}
