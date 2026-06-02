export type Project = {
  id: string;
  theme: string;
  suggestion?: string;
  status: string;
  viralScore?: number;
  createdAt: string;
  script?: { content: string; summary: string; viralScore: number; viralReason: string; narratorGender?: string };
  translations?: Array<{ id: string; language: string; status: string }>;
  audioFiles?: Array<{ id: string; language: string; status: string; filePath: string; durationSeconds?: number; elevenLabsVoiceId?: string; provider?: string; model?: string; voice?: string; attempt?: number; errorMessage?: string }>;
  thumbnail?: { filePath: string; prompt?: string; status: string; provider?: string; model?: string; style?: string; width?: number; height?: number; errorMessage?: string; generatedAt?: string };
  videoFiles?: Array<{ id: string; language: string; type: string; partNumber?: number; filePath: string; durationSeconds: number }>;
  publishJobs?: Array<{ id: string; status: string }>;
};

export type ProcessingLog = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  status: string;
  message?: string;
  errorMessage?: string;
  errorStack?: string;
  provider?: string;
  model?: string;
  voice?: string;
  attempt?: number;
  metadataJson?: Record<string, unknown>;
  createdAt: string;
};

export type UserSettings = {
  viralScoreThreshold: number;
  defaultLanguages: string[];
  defaultVoiceId: string;
  autoRunAfterApproval: boolean;
};

export type Channel = {
  id: string;
  platform: "YOUTUBE" | "TIKTOK";
  name: string;
  language: string;
  isActive: boolean;
};
