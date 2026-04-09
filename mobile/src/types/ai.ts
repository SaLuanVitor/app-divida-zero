export interface AiNextAction {
  title: string;
  description: string;
  cta: string;
  confidence: number;
}

export interface AiAlert {
  type: 'cashflow' | 'delay' | 'habit';
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommended_action: string;
}

export interface AiCategorizeSuggestion {
  suggested_category: string;
  suggested_flow_type: 'income' | 'expense';
  confidence: number;
  reasoning_short: string;
}

export interface AiReportsBriefing {
  title: string;
  summary: string;
  actions: string[];
  confidence: number;
}

export interface AiResponseMeta {
  interaction_id: number;
  source: 'llm' | 'fallback';
}

export interface DailyMessageDto {
  id: number;
  date: string;
  title: string;
  body: string;
  theme: string;
}
