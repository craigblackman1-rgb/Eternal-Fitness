"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
}

/**
 * Shared browser speech-recognition hook — extracted verbatim from the retired
 * LiveSessionLog so the consolidated desktop logger keeps voice-dictated notes
 * without a second implementation. One recognition instance at a time; `start`
 * takes a callback that receives each *final* transcript chunk, letting the
 * caller decide where the text lands (session notes vs. an exercise note).
 */
export function useSpeechNotes() {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef<((transcript: string) => void) | null>(null);

  const speechSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const initRecognition = useCallback((): SpeechRecognition | null => {
    if (recognitionRef.current) return recognitionRef.current;
    const ctor =
      (window as unknown as Record<string, unknown>).SpeechRecognition ??
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (typeof ctor !== "function") return null;
    const r = new (ctor as new () => SpeechRecognition)();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-GB";
    r.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          onResultRef.current?.(t);
        }
      }
    };
    r.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    r.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = r;
    return r;
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const start = useCallback(
    (onFinalTranscript: (transcript: string) => void): boolean => {
      if (listening) return false;
      const r = initRecognition();
      if (!r) return false;
      onResultRef.current = onFinalTranscript;
      r.start();
      setListening(true);
      return true;
    },
    [listening, initRecognition],
  );

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
    recognitionRef.current = null;
  }, []);

  return { listening, speechSupported, start, stop };
}
