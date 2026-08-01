import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarIcon, Clock, AlertTriangle } from "lucide-react";
import { format, addDays, startOfToday } from "date-fns";
import { Link } from "wouter";
import PageHeader from "@/components/layout/page-header";

export default function Schedule() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const userId = 1; // Default user ID for demo
  
  // Fetch revision items due for review
  const { data: revisionItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ["/api/revision-items/due", { userId }],
    queryFn: () => fetch(`/api/revision-items/due?userId=${userId}`).then(res => res.json())
  });
  
  // Fetch notes for reference
  const { data: notes, isLoading: isLoadingNotes } = useQuery({
    queryKey: ["/api/notes", { userId }],
    queryFn: () => fetch(`/api/notes?userId=${userId}`).then(res => res.json())
  });
  
  // Generate review schedule
  const generateSchedule = () => {
    if (!revisionItems || !notes) return [];
    
    // For demo purposes, create a schedule for the next 7 days
    const today = startOfToday();
    const schedule = [];
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(today, i);
      const itemsForDay = revisionItems
        .filter((item: any) => {
          const reviewDate = new Date(item.nextReviewDate);
          return reviewDate.toDateString() === day.toDateString();
        })
        .map((item: any) => {
          const note = notes.find((n: any) => n.id === item.noteId);
          return {
            ...item,
            noteTitle: note?.title || 'Unknown Note'
          };
        });
      
      schedule.push({
        date: day,
        items: itemsForDay
      });
    }
    
    return schedule;
  };
  
  const schedule = generateSchedule();
  
  // Get review items for selected date
  const getItemsForSelectedDate = () => {
    if (!date || !schedule) return [];
    
    const selectedDateString = date.toDateString();
    const daySchedule = schedule.find(day => day.date.toDateString() === selectedDateString);
    
    return daySchedule?.items || [];
  };
  
  const selectedDateItems = getItemsForSelectedDate();
  
  return (
    <>
      <PageHeader 
        title="Revision schedule" 
        description="Organize and track your revision sessions"
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarIcon className="mr-2 h-5 w-5 text-primary-500" />
                Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
          
          {/* Schedule for selected date */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-primary-500" />
                Revisions for {date ? format(date, 'dd MMMM yyyy') : 'selected day'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingItems || isLoadingNotes ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : selectedDateItems.length > 0 ? (
                <div className="space-y-4">
                  {selectedDateItems.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900">{item.noteTitle}</h3>
                        <p className="text-sm text-gray-500">
                          Mastery level: {item.masteryLevel}%
                        </p>
                      </div>
                      <Button asChild>
                        <Link to={`/notes/${item.noteId}`}>
                          Review
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center h-60">
                  <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No revision scheduled
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    You have no revision scheduled for this date.
                  </p>
                  <Button asChild variant="outline">
                    <Link to="/notes">
                      View your notes
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Weekly overview */}
        <div className="mt-8">
          <Tabs defaultValue="weekly">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Revision overview</h2>
              <TabsList>
                <TabsTrigger value="weekly">Week</TabsTrigger>
                <TabsTrigger value="monthly">Month</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="weekly">
              {isLoadingItems ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                  {schedule.map((day, index) => (
                    <Card key={index} className={day.date.toDateString() === date?.toDateString() ? 'border-primary-500' : ''}>
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-medium">
                          {format(day.date, 'EEEE')}
                          <span className="block text-xs text-gray-500">
                            {format(day.date, 'dd/MM')}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 px-4">
                        {day.items.length > 0 ? (
                          <div className="space-y-2">
                            {day.items.slice(0, 3).map((item: any) => (
                              <div key={item.id} className="text-xs bg-gray-50 p-2 rounded">
                                {item.noteTitle}
                              </div>
                            ))}
                            {day.items.length > 3 && (
                              <p className="text-xs text-gray-500 text-center">
                                +{day.items.length - 3} more
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 text-center py-2">
                            No revision
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="monthly">
              <div className="flex items-center justify-center py-12 text-center">
                <div>
                  <p className="text-gray-500 mb-4">
                    The monthly view will be available soon.
                  </p>
                  <Button onClick={() => document.querySelector<HTMLButtonElement>('[value="weekly"]')?.click()}>
                    View the weekly view
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
