export interface Survey {
  id: string;
  title: string;
  description: string;
  userId?: string;
  created_by?: string;
  createdAt?: Date;
  created_at?: string;
  isActive?: boolean;
  is_active?: boolean;
  creatorName?: string;
  creator_email?: string;
  responseCount?: number;
  response_count?: number;
}

export interface SurveyListItem {
  id: string;
  title: string;
  description: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  creator_email: string;
  response_count: number;
}

export interface SurveyQuestion {
  id: number;
  surveyId: number;
  questionText: string;
  questionType: 'multiple_choice' | 'text' | 'rating';
  options?: string[] | null;
  isRequired: boolean;
  position: number;
}

export interface SurveyDetail extends Survey {
  questions: SurveyQuestion[];
}

export interface SurveyResponse {
  surveyId: number;
  responses: Record<string, any>;
}

export interface DashboardStats {
  totalSurveys: number;
  totalResponses: number;
  recentSurveys: Survey[];
  survey?: {
    id: string;
    title: string;
    description: string;
    created_by: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    creator_email: string;
  };
  questions?: Array<{
    id: string;
    survey_id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'text' | 'rating';
    options: string[];
    is_required: boolean;
    order_index: number;
  }>;
}
