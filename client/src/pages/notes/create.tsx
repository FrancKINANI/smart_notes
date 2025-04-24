import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import NoteEditor from "@/components/notes/note-editor";
import FileUpload from "@/components/dropzone/file-upload";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { processImageOCR } from "@/lib/ocr";

// Form schema for text notes
const textNoteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subjectId: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
});

export default function CreateNote() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("text");
  const userId = 1; // Default user ID for demo
  
  // Fetch subjects
  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ["/api/subjects"],
    queryFn: () => fetch("/api/subjects").then(res => res.json())
  });
  
  // Setup form for text notes
  const form = useForm<z.infer<typeof textNoteSchema>>({
    resolver: zodResolver(textNoteSchema),
    defaultValues: {
      title: "",
      subjectId: "",
      content: "",
    },
  });
  
  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (values: z.infer<typeof textNoteSchema>) => {
      const response = await apiRequest("POST", "/api/notes", {
        userId,
        subjectId: parseInt(values.subjectId),
        title: values.title,
        content: values.content,
        summary: "",
        enhancedContent: "",
        sourceType: "text"
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Note created",
        description: "Your note has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes/recent"] });
      navigate(`/notes/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create note. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // OCR processing mutation
  const ocrMutation = useMutation({
    mutationFn: processImageOCR,
    onSuccess: (data) => {
      toast({
        title: "Image processed",
        description: "Your handwritten note has been processed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes/recent"] });
      navigate(`/notes/${data.note.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process image. Please try again with a clearer image.",
        variant: "destructive",
      });
    }
  });
  
  // Handle text note submission
  const onSubmit = (values: z.infer<typeof textNoteSchema>) => {
    createNoteMutation.mutate(values);
  };
  
  // Handle image upload for OCR
  const handleImageUpload = async (file: File, title: string, subjectId: string) => {
    // Convert file to base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64Image = reader.result?.toString().split(',')[1];
      if (base64Image) {
        ocrMutation.mutate({
          image: base64Image,
          userId,
          subjectId: parseInt(subjectId),
          title
        });
      }
    };
  };
  
  return (
    <div className="py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button variant="ghost" asChild className="mr-4">
              <Link to="/notes">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl font-semibold text-gray-900">Create New Note</h1>
          </div>
        </div>
        
        {/* Input methods tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">Text Input</TabsTrigger>
            <TabsTrigger value="photo">Photo Upload</TabsTrigger>
          </TabsList>
          
          {/* Text input tab */}
          <TabsContent value="text">
            <div className="bg-white p-6 rounded-lg shadow">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter a title for your note" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="subjectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a subject" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingSubjects ? (
                                <SelectItem value="loading" disabled>Loading subjects...</SelectItem>
                              ) : subjects?.map((subject: any) => (
                                <SelectItem key={subject.id} value={subject.id.toString()}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <NoteEditor value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormDescription>
                          Write your note content here. You can format text using the toolbar.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={createNoteMutation.isPending}
                    >
                      {createNoteMutation.isPending ? "Creating..." : "Create Note"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </TabsContent>
          
          {/* Photo upload tab */}
          <TabsContent value="photo">
            <div className="bg-white p-6 rounded-lg shadow">
              <FileUpload 
                onFileUpload={handleImageUpload}
                isLoading={ocrMutation.isPending}
                subjects={subjects || []}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
