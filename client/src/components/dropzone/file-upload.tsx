import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CircleAlert, Upload, Camera, ImagePlus } from "lucide-react";
import { Subject } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFileUpload: (file: File, title: string, subjectId: string) => void;
  isLoading: boolean;
  subjects: Subject[];
}

export default function FileUpload({ onFileUpload, isLoading, subjects }: FileUploadProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const selectedFile = acceptedFiles[0];
    
    // Validate file type
    if (!selectedFile.type.includes('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive"
      });
      return;
    }
    
    // Create preview
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    setFile(selectedFile);
    
    // Clean up preview URL when component unmounts
    return () => URL.revokeObjectURL(objectUrl);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    } 
  });

  const handleSubmit = () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please upload an image of your notes",
        variant: "destructive"
      });
      return;
    }
    
    if (!title) {
      toast({
        title: "Title required",
        description: "Please enter a title for your notes",
        variant: "destructive"
      });
      return;
    }
    
    if (!subjectId) {
      toast({
        title: "Subject required",
        description: "Please select a subject for your notes",
        variant: "destructive"
      });
      return;
    }
    
    onFileUpload(file, title, subjectId);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter a title for your notes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Select
              value={subjectId}
              onValueChange={setSubjectId}
              disabled={isLoading}
            >
              <SelectTrigger id="subject">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id.toString()}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <div>
        <div 
          {...getRootProps()} 
          className={`
            border-2 border-dashed rounded-md p-6 flex justify-center hover:border-primary-500
            ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-gray-50'}
            ${isLoading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input {...getInputProps()} />
          {previewUrl ? (
            <div className="text-center">
              <img 
                src={previewUrl} 
                alt="Note preview" 
                className="max-h-40 mx-auto mb-4 rounded" 
              />
              <p className="text-sm text-gray-500">
                Click or drag to change image
              </p>
            </div>
          ) : (
            <div className="text-center">
              <ImagePlus className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900 mb-1">
                {isDragActive ? 'Drop your image here' : 'Upload your handwritten notes'}
              </p>
              <p className="text-xs text-gray-500">
                Drag and drop an image, or click to select
              </p>
              <p className="text-xs text-gray-500 mt-2">
                PNG, JPG, GIF up to 10MB
              </p>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center">
        <CircleAlert className="h-5 w-5 text-amber-500 mr-2" />
        <p className="text-sm text-gray-500">
          For best OCR results, ensure your handwriting is clear and the image is well-lit.
        </p>
      </div>
      
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit}
          disabled={isLoading || !file}
        >
          {isLoading ? (
            <>Processing...</>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Process Image
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
