"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useAudioPlayback(src: string | File | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playback, setPlayback] = useState<{
    source: string | File | null;
    isPlaying: boolean;
    isLoading: boolean;
  }>({ source: null, isPlaying: false, isLoading: false });

  const isCurrentSource = playback.source === src;
  const isPlaying = isCurrentSource && playback.isPlaying;
  const isLoading = isCurrentSource && playback.isLoading;

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        const currentSrc = audioRef.current.src;
        audioRef.current.removeAttribute("src");
        audioRef.current = null;
        if (src instanceof File && currentSrc.startsWith("blob:")) {
          URL.revokeObjectURL(currentSrc);
        }
      }
    };
  }, [src]);

  const togglePlay = useCallback(() => {
    if (!src) return;

    if (!audioRef.current) {
      const url = src instanceof File ? URL.createObjectURL(src) : src;
      audioRef.current = new Audio(url);
      audioRef.current.addEventListener("ended", () => {
        setPlayback({ source: src, isPlaying: false, isLoading: false });
      });
      audioRef.current.addEventListener(
        "canplaythrough",
        () => setPlayback((current) => ({ ...current, isLoading: false })),
        { once: true },
      );
    }

    if (isPlaying) {
      audioRef.current.pause();
      setPlayback({ source: src, isPlaying: false, isLoading: false });
    } else {
      setPlayback({ source: src, isPlaying: false, isLoading: true });
      audioRef.current.play()
        .then(() => {
          setPlayback({ source: src, isPlaying: true, isLoading: false });
        })
        .catch(() => {
          setPlayback({ source: src, isPlaying: false, isLoading: false });
        });
    }
  }, [src, isPlaying]);

  return { isPlaying, isLoading, togglePlay };
};
