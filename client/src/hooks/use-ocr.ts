import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { processImageOCR } from "@/lib/ocr";
import { useLocation } from "wouter";

export function useOcr(userId: number) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  const processImage = async (file: File, subjectId: number, title: string) => {
    setIsProcessing(true);
    
    try {
      // Convert file to base64
      const base64Image = await fileToBase64(file);
      
      if (!base64Image) {
        throw new Error("Failed to convert image to base64");
      }
      
      // Send to OCR API
      const result = await processImageOCR({
        image: base64Image,
        userId,
        subjectId,
        title
      });
      
      // Display success message
      toast({
        title: "Success!",
        description: "Your handwritten notes have been processed successfully",
      });
      
      // Navigate to the created note
      navigate(`/notes/${result.note.id}`);
    } catch (error) {
      console.error("OCR processing error:", error);
      toast({
        title: "Processing failed",
        description: "We couldn't process your image. Please try again with a clearer image.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Convert File to base64 string
  const fileToBase64 = (file: File): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Extract base64 data from data URL
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          resolve(null);
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  return { processImage, isProcessing };
}
