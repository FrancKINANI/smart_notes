import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusIcon, UploadIcon, SearchIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/layout/page-header";
import NoteCard from "@/components/notes/note-card";
import UploadModal from "@/components/modals/upload-modal";
import { useState } from "react";
import { Note, Subject } from "@shared/schema";

export default function Notes() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  
  // Default user ID for demo purposes
  const userId = 1;
  
  // Fetch notes
  const { data: notes, isLoading: isLoadingNotes } = useQuery({
    queryKey: ["/api/notes", { userId }],
    queryFn: () => fetch(`/api/notes?userId=${userId}`).then(res => res.json())
  });
  
  // Fetch subjects
  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ["/api/subjects"],
    queryFn: () => fetch("/api/subjects").then(res => res.json())
  });
  
  // Filter notes based on search query and selected subject
  const filteredNotes = notes ? notes.filter((note: Note) => {
    const matchesSearch = searchQuery === "" || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSubject = selectedSubject === "all" || note.subjectId.toString() === selectedSubject;
    
    return matchesSearch && matchesSubject;
  }) : [];
  
  // Sort notes by creation date (newest first)
  const sortedNotes = [...(filteredNotes || [])].sort(
    (a: Note, b: Note) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  // Actions for the header
  const headerActions = (
    <>
      <Button asChild>
        <Link to="/notes/create">
          <PlusIcon className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Nouvelle note</span>
          <span className="sm:hidden">Note</span>
        </Link>
      </Button>
      <Button variant="outline" onClick={() => setIsUploadModalOpen(true)}>
        <UploadIcon className="mr-2 h-4 w-4" />
        <span className="hidden sm:inline">Importer</span>
        <span className="sm:hidden">Import</span>
      </Button>
    </>
  );

  return (
    <>
      <PageHeader 
        title="Mes Notes" 
        description="Gérez et organisez toutes vos notes d'étude"
        actions={headerActions}
      />
      
      {/* Search and filter controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Rechercher dans vos notes..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les sujets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les sujets</SelectItem>
                {subjects && subjects.map((subject: Subject) => (
                  <SelectItem key={subject.id} value={subject.id.toString()}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Notes content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6 pb-6">
        <Tabs defaultValue="grid">
          <div className="flex justify-end mb-4">
            <TabsList>
              <TabsTrigger value="grid">Grille</TabsTrigger>
              <TabsTrigger value="list">Liste</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="grid">
            {isLoadingNotes ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white shadow rounded-lg h-48 animate-pulse" />
                ))}
              </div>
            ) : sortedNotes.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {sortedNotes.map((note: Note) => (
                  <NoteCard 
                    key={note.id} 
                    note={note} 
                    subject={subjects?.find((s: Subject) => s.id === note.subjectId)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Aucune note trouvée. Créez votre première note !</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="list">
            {isLoadingNotes ? (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="px-4 py-4 border-b border-gray-200 animate-pulse h-16" />
                ))}
              </div>
            ) : sortedNotes.length > 0 ? (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul role="list" className="divide-y divide-gray-200">
                  {sortedNotes.map((note: Note) => {
                    const subject = subjects?.find((s: Subject) => s.id === note.subjectId);
                    return (
                      <li key={note.id}>
                        <Link to={`/notes/${note.id}`}>
                          <div className="block hover:bg-gray-50">
                            <div className="px-4 py-4 sm:px-6">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-primary-600 truncate">{note.title}</p>
                                <div className="ml-2 flex-shrink-0 flex">
                                  {subject && (
                                    <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                                       style={{ backgroundColor: `${subject.color}20`, color: subject.color }}>
                                      {subject.name}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="mt-2 sm:flex sm:justify-between">
                                <div className="sm:flex">
                                  <p className="flex items-center text-sm text-gray-500 truncate">
                                    {note.content.substring(0, 100)}...
                                  </p>
                                </div>
                                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                  <p>
                                    {new Date(note.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Aucune note trouvée. Créez votre première note !</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Upload modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        userId={userId}
      />
    </>
  );
}
