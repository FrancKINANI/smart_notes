import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload } from "lucide-react";
import FileUpload from "@/components/dropzone/file-upload";
import { useQuery } from "@tanstack/react-query";
import { useOcr } from "@/hooks/use-ocr";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
}

export default function UploadModal({ isOpen, onClose, userId }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState("photo");
  
  // OCR processing hook
  const { processImage, isProcessing } = useOcr(userId);
  
  // Fetch subjects
  const { data: subjects } = useQuery({
    queryKey: ["/api/subjects"],
    queryFn: () => fetch("/api/subjects").then(res => res.json())
  });
  
  // Handle image upload and processing
  const handleImageUpload = async (file: File, title: string, subjectId: string) => {
    await processImage(file, parseInt(subjectId), title);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2 text-primary-500" />
            Importer des notes
          </DialogTitle>
          <DialogDescription>
            Téléchargez une photo de vos notes manuscrites ou importez un document.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="photo">Photo</TabsTrigger>
            <TabsTrigger value="document">Document</TabsTrigger>
          </TabsList>
          
          <TabsContent value="photo" className="py-4">
            <FileUpload 
              onFileUpload={handleImageUpload}
              isLoading={isProcessing}
              subjects={subjects || []}
            />
          </TabsContent>
          
          <TabsContent value="document" className="py-4">
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                L'importation de documents (PDF, DOC) sera disponible prochainement.
              </p>
              <Button onClick={() => setActiveTab("photo")}>
                Utiliser l'importation de photos
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
