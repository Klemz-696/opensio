'use client';

import { useEffect, useRef, useState } from 'react';
import { sendLessonHeartbeat } from '../api/progress-api';

const HEARTBEAT_INTERVAL_SECONDS = 30;

export function useLessonHeartbeat(
  lessonSlug: string | undefined,
  token: string | null,
) {
  const [activeSeconds, setActiveSeconds] = useState(0);
  const isTabActiveRef = useRef(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onFocus = () => {
      isTabActiveRef.current = true;
    };
    const onBlur = () => {
      isTabActiveRef.current = false;
    };
    const onVisibilityChange = () => {
      isTabActiveRef.current = document.visibilityState === 'visible';
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!lessonSlug || !token) return;

    // Premier battement de démarrage (15s d'introduction)
    void sendLessonHeartbeat(lessonSlug, 15, token).catch(() => {});

    const interval = setInterval(() => {
      if (isTabActiveRef.current) {
        setActiveSeconds((prev) => prev + HEARTBEAT_INTERVAL_SECONDS);
        void sendLessonHeartbeat(
          lessonSlug,
          HEARTBEAT_INTERVAL_SECONDS,
          token,
        ).catch(() => {});
      }
    }, HEARTBEAT_INTERVAL_SECONDS * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [lessonSlug, token]);

  return { activeSeconds };
}
