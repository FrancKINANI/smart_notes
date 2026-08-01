import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateStudyPlan, UserContext } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, Clock, BookOpen, Save } from "lucide-react";

interface StudyPlanGeneratorProps {
  userContext?: UserContext;
  onSavePlan?: (plan: any) => void;
}

export function StudyPlanGenerator({
  userContext = {},
  onSavePlan,
}: StudyPlanGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("1 week");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!topic) {
      toast({
        title: "Topic required",
        description: "Please enter a topic to generate a study plan.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const plan = await generateStudyPlan(topic, duration, userContext);
      setGeneratedPlan(plan);
      setIsDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description:
          "Unable to generate a study plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (onSavePlan && generatedPlan) {
      onSavePlan(generatedPlan);
      toast({
        title: "Plan saved",
        description: "Your study plan was saved successfully.",
      });
      setIsDialogOpen(false);
    }
  };

  // Format the study plan content for display
  const formatPlanContent = (content: string) => {
    // Convert Markdown headings to HTML
    let formattedContent = content
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mb-2 mt-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mb-2 mt-3">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-md font-medium mb-1 mt-2">$1</h3>');

    // Convert lists
    formattedContent = formattedContent
      .replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/<\/li>\n<li/g, '</li><li');

    // Wrap lists in ul tags
    formattedContent = formattedContent
      .replace(/(<li.*<\/li>)/gs, '<ul class="list-disc mb-2">$1</ul>');

    // Convert paragraphs
    formattedContent = formattedContent
      .replace(/^(?!<[h|u|l])(.*$)/gim, '<p class="mb-2">$1</p>')
      .replace(/<p><\/p>/g, '');

    // Remove empty paragraphs
    formattedContent = formattedContent.replace(/<p>\s*<\/p>/g, '');

    return formattedContent;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-primary-500" />
            Personalized study plan generator
          </CardTitle>
          <CardDescription>
            Create a detailed study plan tailored to your needs and your
            learning style
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Study topic</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Python programming, French Revolution, Calculus..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Plan duration</Label>
            <Select
              value={duration}
              onValueChange={(value) => setDuration(value)}
            >
              <SelectTrigger id="duration">
                <SelectValue placeholder="Select a duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3 days">Short (3 days)</SelectItem>
                <SelectItem value="1 week">Medium (1 week)</SelectItem>
                <SelectItem value="2 weeks">Long (2 weeks)</SelectItem>
                <SelectItem value="1 month">Intensive (1 month)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4" />
                Generate a study plan
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{generatedPlan?.title}</DialogTitle>
            <DialogDescription className="flex items-center text-primary-500">
              <Clock className="mr-2 h-4 w-4" />
              Duration: {generatedPlan?.duration}
            </DialogDescription>
          </DialogHeader>

          <div className="study-plan-content">
            {generatedPlan && (
              <div
                dangerouslySetInnerHTML={{
                  __html: formatPlanContent(generatedPlan.content),
                }}
                className="prose prose-sm max-w-none"
              />
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
            {onSavePlan && (
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save this plan
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 