export interface Survey {
  id: number;
  title: string;
  description: string;
  userId: number;
  createdAt: Date;
  isActive: boolean;
  creatorName?: string;
  responseCount?: number;
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
