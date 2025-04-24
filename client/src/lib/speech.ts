// Client-side text-to-speech using the browser's built-in SpeechSynthesis API
// This is used for immediate playback in the browser
// For server-side TTS generation (for podcasts, etc.), we use the /api/tts endpoint

export function speak(text: string): void {
  if (!("speechSynthesis" in window)) {
    console.error("Speech synthesis is not supported in this browser");
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR"; // French language
  utterance.rate = 1.0; // Normal speed
  utterance.pitch = 1.0; // Normal pitch

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeaking(): boolean {
  return "speechSynthesis" in window && window.speechSynthesis.speaking;
}
