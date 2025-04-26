import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useOffline } from "@/hooks/use-offline";
import { useQueryClient } from "@tanstack/react-query";
import { saveNoteOffline, syncOfflineChanges } from "@/lib/indexedDB";
import { debounce } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
} from "lucide-react";

interface NoteEditorProps {
  initialData?: {
    id?: number;
    title: string;
    content: string;
    subjectId: number;
  };
  onSave?: (data: any) => void;
}

export default function NoteEditor({ initialData, onSave }: NoteEditorProps) {
  const { register, handleSubmit, watch } = useForm({
    defaultValues: initialData || {
      title: "",
      content: "",
      subjectId: 1,
    },
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { isOffline } = useOffline();
  const [activeTab, setActiveTab] = useState<string>("edit");

  // Auto-save debounced function
  const debouncedSave = debounce(async (data: any) => {
    try {
      if (isOffline) {
        await saveNoteOffline({
          ...data,
          userId: 1, // TODO: Get from auth context
          updatedAt: new Date().toISOString(),
        });
        toast({
          title: "Note sauvegardée hors-ligne",
          description:
            "La note sera synchronisée une fois la connexion rétablie",
          variant: "default",
        });
      } else {
        await onSave?.(data);
        queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder la note",
        variant: "destructive",
      });
    }
  }, 2000);

  // Watch form changes for auto-save
  const formData = watch();
  useEffect(() => {
    if (formData.title || formData.content) {
      debouncedSave(formData);
    }
  }, [formData, debouncedSave]);

  // Listen for online status changes
  useEffect(() => {
    if (!isOffline) {
      syncOfflineChanges().catch(console.error);
    }
  }, [isOffline]);

  const onSubmit = async (data: any) => {
    try {
      setIsSaving(true);

      if (isOffline) {
        await saveNoteOffline({
          ...data,
          userId: 1, // TODO: Get from auth context
          updatedAt: new Date().toISOString(),
        });
        toast({
          title: "Note sauvegardée hors-ligne",
          description:
            "La note sera synchronisée une fois la connexion rétablie",
          variant: "default",
        });
      } else {
        await onSave?.(data);
        queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      }

      navigate("/notes");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder la note",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Insert formatting at cursor position or around selected text
  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.content.substring(start, end);
    const beforeText = formData.content.substring(0, start);
    const afterText = formData.content.substring(end);

    const newText = beforeText + prefix + selectedText + suffix + afterText;
    onSave?.({ ...formData, content: newText });

    // Re-focus and re-select
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 0);
  };

  const formatButtons = [
    {
      label: "Bold",
      icon: <Bold className="h-4 w-4" />,
      prefix: "**",
      suffix: "**",
    },
    {
      label: "Italic",
      icon: <Italic className="h-4 w-4" />,
      prefix: "*",
      suffix: "*",
    },
    {
      label: "Underline",
      icon: <Underline className="h-4 w-4" />,
      prefix: "__",
      suffix: "__",
    },
    {
      label: "Bullet List",
      icon: <List className="h-4 w-4" />,
      prefix: "- ",
      suffix: "",
    },
    {
      label: "Numbered List",
      icon: <ListOrdered className="h-4 w-4" />,
      prefix: "1. ",
      suffix: "",
    },
    {
      label: "Heading 1",
      icon: <Heading1 className="h-4 w-4" />,
      prefix: "# ",
      suffix: "",
    },
    {
      label: "Heading 2",
      icon: <Heading2 className="h-4 w-4" />,
      prefix: "## ",
      suffix: "",
    },
    {
      label: "Heading 3",
      icon: <Heading3 className="h-4 w-4" />,
      prefix: "### ",
      suffix: "",
    },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <input
          {...register("title")}
          type="text"
          placeholder="Titre de la note"
          className="w-full p-2 border rounded-md"
          required
        />
      </div>

      <div className="border rounded-md">
        {/* Formatting toolbar */}
        <div className="flex items-center space-x-1 border-b p-2 bg-gray-50">
          {formatButtons.map((button) => (
            <Button
              key={button.label}
              variant="ghost"
              size="sm"
              title={button.label}
              onClick={() => insertFormatting(button.prefix, button.suffix)}
            >
              {button.icon}
            </Button>
          ))}
        </div>

        {/* Editor/Preview tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-end px-4 pt-2">
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="edit" className="p-4 pt-0">
            <Textarea
              {...register("content")}
              placeholder="Contenu de la note..."
              className="min-h-[200px] border-none focus-visible:ring-0 resize-y"
              required
            />
          </TabsContent>

          <TabsContent value="preview" className="p-4 border-t">
            {formData.content ? (
              <div className="prose max-w-none">
                {formData.content.split("\n").map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 italic">No content to preview</div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-2">
        <select
          {...register("subjectId")}
          className="w-full p-2 border rounded-md"
          required
        >
          <option value="1">Mathématiques</option>
          <option value="2">Physique</option>
          <option value="3">Chimie</option>
          {/* Add more subjects */}
        </select>
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/notes")}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </div>

      {isOffline && (
        <div className="mt-4 p-2 bg-yellow-50 text-yellow-800 rounded-md">
          Mode hors-ligne : Les modifications seront synchronisées une fois la
          connexion rétablie
        </div>
      )}
    </form>
  );
}
