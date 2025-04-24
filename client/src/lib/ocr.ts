import { apiRequest } from "./queryClient";

export interface OcrRequest {
  image: string; // Base64 encoded image
  userId: number;
  subjectId: number;
  title: string;
}

export interface OcrResponse {
  note: {
    id: number;
    title: string;
    content: string;
    createdAt: string;
    [key: string]: any;
  };
  ocrText: string;
}

export async function processImageOCR(params: OcrRequest): Promise<OcrResponse> {
  const response = await apiRequest("POST", "/api/notes/ocr", params);
  return await response.json();
}
