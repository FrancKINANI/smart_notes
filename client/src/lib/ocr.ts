import { apiRequest } from "./api-client";

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

export async function processImageOCR(
  params: OcrRequest
): Promise<OcrResponse> {
  const response = await apiRequest("/api/notes/ocr", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return response;
}
