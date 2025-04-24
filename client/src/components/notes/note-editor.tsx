import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Heading3
} from "lucide-react";

interface NoteEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function NoteEditor({ value, onChange }: NoteEditorProps) {
  const [activeTab, setActiveTab] = useState<string>("edit");

  // Insert formatting at cursor position or around selected text
  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    const newText = beforeText + prefix + selectedText + suffix + afterText;
    onChange(newText);

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
    { label: "Bold", icon: <Bold className="h-4 w-4" />, prefix: "**", suffix: "**" },
    { label: "Italic", icon: <Italic className="h-4 w-4" />, prefix: "*", suffix: "*" },
    { label: "Underline", icon: <Underline className="h-4 w-4" />, prefix: "__", suffix: "__" },
    { label: "Bullet List", icon: <List className="h-4 w-4" />, prefix: "- ", suffix: "" },
    { label: "Numbered List", icon: <ListOrdered className="h-4 w-4" />, prefix: "1. ", suffix: "" },
    { label: "Heading 1", icon: <Heading1 className="h-4 w-4" />, prefix: "# ", suffix: "" },
    { label: "Heading 2", icon: <Heading2 className="h-4 w-4" />, prefix: "## ", suffix: "" },
    { label: "Heading 3", icon: <Heading3 className="h-4 w-4" />, prefix: "### ", suffix: "" },
  ];

  return (
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
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write your notes here..."
            className="min-h-[200px] border-none focus-visible:ring-0 resize-y"
          />
        </TabsContent>
        
        <TabsContent value="preview" className="p-4 border-t">
          {value ? (
            <div className="prose max-w-none">
              {value.split('\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 italic">No content to preview</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
