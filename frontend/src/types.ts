export type SessionSummary = {
  sessionKey: string;
  title: string;
  model: string;
  totalRounds: number;
  createdDate: string;
  roleFocus: string;
};

export type ApiSession = {
  sessionKey: string;
  title: string;
  sourceFilePath: string | null;
  replyFilePath: string | null;
  model: string | null;
  totalRounds: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiTurn = {
  roundNumber: number;
  sourceRoundNumbers?: number[];
  normalizationNote?: string;
  interviewerText: string;
  interviewerNeedsReview: boolean;
  candidateText: string;
  candidateNeedsReview: boolean;
  rawBlock: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionsResponse = {
  items: ApiSession[];
};

export type TurnsResponse = {
  session: ApiSession;
  items: ApiTurn[];
};

export type MergeTurnsRequest = {
  roundNumbers: number[];
  mergedInterviewerText: string;
  mergedCandidateText: string;
};

export type DeleteTurnRequest = {
  roundNumber: number;
};

export type ReviewMetric = {
  label: string;
  value: string;
};

export type Suggestion = {
  title: string;
  description: string;
};

export type RoundReview = {
  headline: string;
  diagnosis: string;
  score: number;
  scoreLabel: string;
  observations: string[];
  suggestions: Suggestion[];
  followUpPrompts: string[];
  metrics: ReviewMetric[];
};

export type RoundItem = {
  roundNumber: number;
  sourceRoundNumbers?: number[];
  cueTime?: string;
  title: string;
  interviewerText: string;
  candidateText: string;
  notes?: string;
  needsReview?: boolean;
  review: RoundReview;
};
