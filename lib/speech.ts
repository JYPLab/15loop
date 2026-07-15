const preferredEnglishVoice = (voices: SpeechSynthesisVoice[]) => (
  voices.find((voice) => voice.lang.toLowerCase() === "en-us")
  ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("en-"))
);

/**
 * Start speech while a user gesture is still active. Mobile Safari can leave
 * its speech engine paused after the app returns to the foreground, so resume
 * it before each pronunciation request.
 */
export function speakEnglish(text: string) {
  if (
    typeof window === "undefined"
    || !("speechSynthesis" in window)
    || typeof SpeechSynthesisUtterance === "undefined"
  ) return false;

  try {
    const synthesis = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = preferredEnglishVoice(synthesis.getVoices());

    utterance.lang = "en-US";
    utterance.rate = 0.78;
    if (voice) utterance.voice = voice;

    synthesis.resume();
    synthesis.cancel();
    synthesis.speak(utterance);

    // Safari sometimes pauses synthesis when returning from the background.
    window.setTimeout(() => {
      if (synthesis.paused) synthesis.resume();
    }, 0);

    return true;
  } catch {
    return false;
  }
}
