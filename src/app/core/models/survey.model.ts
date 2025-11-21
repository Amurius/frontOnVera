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
}
