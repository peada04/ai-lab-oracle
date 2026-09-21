export interface LabSpec {
  id: string;
  label: string;
  value: string;
  icon?: string;
}

export type LabSpecs = LabSpec[];

export interface JournalEntry {
  project: string;
  status: 'Success' | 'In-Progress' | 'Failed';
  learnings: string;
}

export type ModelProvider = 'gemini' | 'local';

export interface AnalysisResult {
  feasibility: 'PASS' | 'FAIL' | 'CONDITIONAL';
  reasoning: string;
  suggestions: string[];
  modelUsed?: ModelProvider;
}

export interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  author?: string;
}

export interface OracleExperiment {
  id: number;
  title: string;
  sourceLink: string | null;
  ideaText: string;
  analysis: AnalysisResult;
  plan: ImplementationPlan | null;
  createdAt: string;
}

export interface ImplementationStep {
  phase: string;
  tasks: string[];
  hardware_considerations: string;
}

export interface ImplementationPlan {
  title: string;
  summary: string;
  git_resources: { name: string; url: string }[];
  architecture_recommendation: string;
  steps: ImplementationStep[];
  agent_instructions: string;
  modelUsed?: ModelProvider;
}
