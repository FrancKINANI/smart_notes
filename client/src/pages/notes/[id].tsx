import React from "react";
import { useParams } from "wouter";
import { AIChat } from "@/components/ai/ai-chat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNote } from "@/hooks/useNote";
import { CommentSection } from "@/components/comments/comment-section";

export default function NotePage() {
  const params = useParams();
  const noteId = parseInt(params.id);
  const { note } = useNote(noteId);

  return (
    <div className="container mx-auto py-6">
      <PageHeader title={note?.title || "Loading..."} />

      <Tabs defaultValue="content" className="mt-6">
        <TabsList>
          <TabsTrigger value="content">Note Content</TabsTrigger>
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          {/* Existing note content */}
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {note?.content || ""}
            </ReactMarkdown>
          </div>
        </TabsContent>

        <TabsContent value="chat">
          <AIChat noteId={noteId} />
        </TabsContent>
      </Tabs>

      <CommentSection noteId={noteId} />
    </div>
  );
}
