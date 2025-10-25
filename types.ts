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
  AWAITING_HELPFUL_PERMISSION,
  AWAITING_HELPFUL_SCORE,
  AWAITING_LIKED_FEEDBACK,
  AWAITING_IMPROVE_FEEDBACK,
  AWAITING_TRANSCRIPT_PERMISSION,
  FEEDBACK_COMPLETE,
  EVALUATION_LOADING,
  EVALUATING,
}

export enum CEOPersona {
  STRICT = 'strict',
  MODERATE = 'moderate',
  LIBERAL = 'liberal',
  LEADING = 'leading',
  SYCOPHANTIC = 'sycophantic',
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
  hints: number;
}

export interface Section {
    section_id: string;
    section_title: string;
    year_term: string;
    chat_model: string | null;
    super_model: string | null;
}