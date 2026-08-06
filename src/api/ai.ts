import { apiClient } from './client'
import type { AiChatMessage, AttritionInsight } from '../types'

export interface ResumeResult { name: string; email: string; phone?: string; skills: string[]; experienceYears: number; summary: string }
export const aiApi = {
  parseResume: async (file: File) => {
    const body = new FormData(); body.append('resume', file)
    return (await apiClient.post<ResumeResult>('/api/ai/resume-parse', body, { headers: { 'Content-Type': 'multipart/form-data' } })).data
  },
  chat: async (message: string, history: AiChatMessage[]) => (await apiClient.post<AiChatMessage>('/api/ai/chatbot', { message, history })).data,
  attritionInsights: async () => (await apiClient.get<AttritionInsight[]>('/api/ai/attrition-insights')).data,
}
