import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const uploadFile = async (file: File): Promise<string | null> => {
    // In a real app, this would upload to a storage service
    // For this demo, we'll simulate the upload process

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      await simulateProgress();

      // Convert file to base64 for demo purposes
      const base64 = await fileToBase64(file);
      
      setUploadProgress(100);
      
      // Success notification
      toast({
        title: "Upload complete",
        description: `${file.name} has been uploaded successfully.`,
      });
      
      return base64;
    } catch (error) {
      console.error("Upload error:", error);
      
      // Error notification
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Simulate upload progress
  const simulateProgress = (): Promise<void> => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 10) + 5;
        if (progress >= 90) {
          clearInterval(interval);
          setUploadProgress(90);
          setTimeout(() => {
            resolve();
          }, 500);
        } else {
          setUploadProgress(progress);
        }
      }, 300);
    });
  };

  // Convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert file to base64"));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  return { 
    uploadFile, 
    isUploading, 
    uploadProgress 
  };
}
