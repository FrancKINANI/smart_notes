import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

// Question types
export enum QuestionType {
  MULTIPLE_CHOICE = "multiple_choice",
  TRUE_FALSE = "true_false",
  SHORT_ANSWER = "short_answer",
  MATCHING = "matching",
  FILL_BLANK = "fill_blank",
}

// Difficulty levels
export enum DifficultyLevel {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
}

// Interface for matching questions
export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

// Type to represent all possible questions
export interface QuizQuestion {
  id: string;
  question: string;
  questionType: QuestionType;
  difficulty: DifficultyLevel;
  points: number;
  correctAnswer?: string;
  options?: string[];
  matchingPairs?: MatchingPair[];
  explanation?: string;
}

interface QuizQuestionProps {
  question: QuizQuestion;
  onAnswerSelect: (questionId: string, answer: any) => void;
  selectedAnswer: any;
  showHint?: (questionId: string) => void;
  hintUsed?: boolean;
}

export function QuizQuestionComponent({
  question,
  onAnswerSelect,
  selectedAnswer,
  showHint,
  hintUsed,
}: QuizQuestionProps) {
  const [matchingSelections, setMatchingSelections] = useState<Record<string, string>>({});

  // Handle selection for matching questions
  const handleMatchingSelect = (leftId: string, rightValue: string) => {
    const newSelections = {
      ...matchingSelections,
      [leftId]: rightValue,
    };
    
    setMatchingSelections(newSelections);
    
    // Update the complete answer
    onAnswerSelect(question.id, newSelections);
  };

  // Render based on question type
  switch (question.questionType) {
    case QuestionType.MULTIPLE_CHOICE:
      return (
        <div>
          <div className="flex justify-between mb-4">
            <h3 className="text-lg font-medium">{question.question}</h3>
            {showHint && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => showHint(question.id)}
                disabled={hintUsed}
                className="text-primary-500 hover:text-primary-600"
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                Hint
              </Button>
            )}
          </div>
          <RadioGroup
            value={selectedAnswer || ""}
            onValueChange={(value) => onAnswerSelect(question.id, value)}
            className="space-y-3"
          >
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem id={`option-${question.id}-${index}`} value={option} />
                <Label
                  htmlFor={`option-${question.id}-${index}`}
                  className="text-base font-normal"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      );

    case QuestionType.TRUE_FALSE:
      return (
        <div>
          <div className="flex justify-between mb-4">
            <h3 className="text-lg font-medium">{question.question}</h3>
            {showHint && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => showHint(question.id)}
                disabled={hintUsed}
                className="text-primary-500 hover:text-primary-600"
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                Hint
              </Button>
            )}
          </div>
          <RadioGroup
            value={selectedAnswer || ""}
            onValueChange={(value) => onAnswerSelect(question.id, value)}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem id={`true-${question.id}`} value="True" />
              <Label htmlFor={`true-${question.id}`} className="text-base font-normal">
                True
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem id={`false-${question.id}`} value="False" />
              <Label htmlFor={`false-${question.id}`} className="text-base font-normal">
                False
              </Label>
            </div>
          </RadioGroup>
        </div>
      );

    case QuestionType.SHORT_ANSWER:
      return (
        <div>
          <div className="flex justify-between mb-4">
            <h3 className="text-lg font-medium">{question.question}</h3>
            {showHint && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => showHint(question.id)}
                disabled={hintUsed}
                className="text-primary-500 hover:text-primary-600"
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                Hint
              </Button>
            )}
          </div>
          <Textarea
            value={selectedAnswer || ""}
            onChange={(e) => onAnswerSelect(question.id, e.target.value)}
            placeholder="Your answer..."
            className="min-h-24"
          />
        </div>
      );

    case QuestionType.FILL_BLANK:
      return (
        <div>
          <div className="flex justify-between mb-4">
            <h3 className="text-lg font-medium">{question.question}</h3>
            {showHint && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => showHint(question.id)}
                disabled={hintUsed}
                className="text-primary-500 hover:text-primary-600"
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                Hint
              </Button>
            )}
          </div>
          <Input
            value={selectedAnswer || ""}
            onChange={(e) => onAnswerSelect(question.id, e.target.value)}
            placeholder="Complete..."
            className="max-w-md"
          />
        </div>
      );

    case QuestionType.MATCHING:
      if (!question.matchingPairs) return null;

      return (
        <div>
          <div className="flex justify-between mb-4">
            <h3 className="text-lg font-medium">{question.question}</h3>
            {showHint && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => showHint(question.id)}
                disabled={hintUsed}
                className="text-primary-500 hover:text-primary-600"
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                Hint
              </Button>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Match each item on the left with its corresponding item on the right.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              {question.matchingPairs.map((pair, index) => (
                <div
                  key={`left-${index}`}
                  className="p-3 bg-primary-50 rounded-md"
                >
                  {pair.left}
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {question.matchingPairs.map((pair, index) => {
                const matchId = `${question.id}-${pair.id}`;
                return (
                  <select
                    key={`right-${index}`}
                    value={
                      selectedAnswer && selectedAnswer[matchId]
                        ? selectedAnswer[matchId]
                        : ""
                    }
                    onChange={(e) =>
                      handleMatchingSelect(matchId, e.target.value)
                    }
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select an answer</option>
                    {question.matchingPairs.map((p, i) => (
                      <option key={i} value={p.right}>
                        {p.right}
                      </option>
                    ))}
                  </select>
                );
              })}
            </div>
          </div>
        </div>
      );

    default:
      return <div>Unsupported question type</div>;
  }
}

// Utility functions to evaluate answers
export function isAnswerCorrect(question: QuizQuestion, userAnswer: any): boolean {
  if (!userAnswer) return false;

  switch (question.questionType) {
    case QuestionType.MATCHING:
      return isMatchingCorrect(question, userAnswer);
    
    case QuestionType.SHORT_ANSWER:
    case QuestionType.FILL_BLANK:
      // Normalize and compare for text answers
      const normalize = (answer: string) => 
        answer.toString().toLowerCase().trim().replace(/\s+/g, ' ');
      
      return normalize(userAnswer) === normalize(question.correctAnswer || '');
    
    default:
      // For choice and true/false questions
      return userAnswer === question.correctAnswer;
  }
}

// Check if matching answers are correct
function isMatchingCorrect(
  question: QuizQuestion,
  userAnswer: Record<string, string>
): boolean {
  if (!question.matchingPairs || !userAnswer) return false;

  for (const pair of question.matchingPairs) {
    const matchId = `${question.id}-${pair.id}`;
    if (userAnswer[matchId] !== pair.right) {
      return false;
    }
  }
  return true;
}

// Format the user's answer for display
export function formatUserAnswer(question: QuizQuestion, userAnswer: any): string {
  if (!userAnswer) return "No answer";

  if (question.questionType === QuestionType.MATCHING && question.matchingPairs) {
    return question.matchingPairs
      .map((pair) => {
        const matchId = `${question.id}-${pair.id}`;
        const matchValue = userAnswer[matchId];
        return `${pair.left} → ${matchValue || "Not matched"}`;
      })
      .join(", ");
  }

  return userAnswer.toString();
}

// Format the correct answer for display
export function formatCorrectAnswer(question: QuizQuestion): string {
  if (question.questionType === QuestionType.MATCHING && question.matchingPairs) {
    return question.matchingPairs
      .map((pair) => `${pair.left} → ${pair.right}`)
      .join(", ");
  }

  return question.correctAnswer || "";
}

// Get the difficulty level label
export function getDifficultyLabel(difficulty: DifficultyLevel): string {
  switch (difficulty) {
    case DifficultyLevel.EASY:
      return "Easy";
    case DifficultyLevel.MEDIUM:
      return "Medium";
    case DifficultyLevel.HARD:
      return "Hard";
    default:
      return "Unknown";
  }
}

// Get the color based on difficulty
export function getDifficultyColor(difficulty: DifficultyLevel): string {
  switch (difficulty) {
    case DifficultyLevel.EASY:
      return "bg-green-100 text-green-800";
    case DifficultyLevel.MEDIUM:
      return "bg-yellow-100 text-yellow-800";
    case DifficultyLevel.HARD:
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
} 