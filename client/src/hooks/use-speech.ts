import { useState, useEffect } from "react";
import { speak, stopSpeaking, isSpeaking } from "@/lib/speech";
import { useToast } from "@/hooks/use-toast";

export function useSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechText, setSpeechText] = useState("");
  const { toast } = useToast();

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isPlaying) {
        stopSpeaking();
      }
    };
  }, [isPlaying]);

  // Play text
  const playText = (text: string) => {
    if (!text || text.trim() === "") {
      toast({
        title: "Cannot play",
        description: "There is no text to play.",
        variant: "destructive"
      });
      return;
    }

    // Stop any existing speech
    if (isPlaying) {
      stopSpeaking();
    }

    setSpeechText(text);
    speak(text);
    setIsPlaying(true);

    // Check if speech has ended
    const checkSpeechEnd = setInterval(() => {
      if (!isSpeaking()) {
        clearInterval(checkSpeechEnd);
        setIsPlaying(false);
      }
    }, 100);
  };

  // Stop playing
  const stopPlaying = () => {
    stopSpeaking();
    setIsPlaying(false);
  };

  // Toggle play/stop
  const togglePlay = (text: string) => {
    if (isPlaying) {
      stopPlaying();
    } else {
      playText(text);
    }
  };

  return {
    isPlaying,
    playText,
    stopPlaying,
    togglePlay,
    speechText
  };
}
