export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
}

export interface Message {
  role: MessageRole;
  content: string;
}

export enum ConversationPhase {
  PRE_CHAT,
  CHATTING,
  EVALUATING,
  EVALUATION_LOADING,
}

export interface EvaluationCriterion {
  question: string;
  score: number;
  feedback: string;
}

export interface EvaluationResult {
  criteria: EvaluationCriterion[];
  totalScore: number;
  summary: string;
}
