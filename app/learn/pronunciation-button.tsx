"use client";

export function PronunciationButton({
  name,
  spoken,
}: {
  name: string;
  spoken: string;
}) {
  function pronounce() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = "zh-CN";
    utterance.rate = 0.78;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <button
      className="pronunciation-button"
      type="button"
      aria-label={`Hear the Chinese names for ${name}`}
      title={`Hear ${spoken}`}
      onClick={pronounce}
    >
      <span aria-hidden="true">◖))</span>
      Hear it
    </button>
  );
}
