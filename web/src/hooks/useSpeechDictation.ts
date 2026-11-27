import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  resultIndex: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const candidate = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

/**
 * Browser-native dictation. No audio leaves the device through STMS; the
 * browser's own speech service handles recognition.
 */
export function useSpeechDictation(onTranscript: (text: string) => void) {
  const [supported] = useState(() => Boolean(getSpeechRecognition()));
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const callbackRef = useRef(onTranscript);

  useEffect(() => {
    callbackRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
    },
    [],
  );

  const start = useCallback(() => {
    const Constructor = getSpeechRecognition();
    if (!Constructor) return;

    setError('');
    const recognition = new Constructor();
    recognition.lang = navigator.language || 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = event.results.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result?.isFinal) transcript += `${result[0].transcript} `;
      }
      if (transcript.trim()) callbackRef.current(transcript.trim());
    };
    recognition.onerror = (event) => {
      setError(
        event.error === 'not-allowed'
          ? 'Microphone access was blocked. You can type instead.'
          : 'Dictation stopped. Please try again or type your text.',
      );
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setError('Dictation could not start. Please type instead.');
      setListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, error, start, stop, toggle };
}
