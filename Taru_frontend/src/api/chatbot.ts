import { apiRequest } from "./client";

export interface ChatbotResponse {
  success: boolean;
  response: string;
}

export async function sendChatbotMessage(
  message: string,
): Promise<ChatbotResponse> {
  return apiRequest("/api/chatbot/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}
