"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearStoredProfile,
  readStoredProfile,
  touchStoredProfile,
  writeStoredProfile,
} from "../lib/session-profile";

const SessionContext = createContext(null);

/**
 * 브라우저 세션 프로필을 화면 간에 공유하고 유휴 시 지운다.
 */
export function SessionProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    try {
      const storage = typeof window === "undefined" ? null : window.sessionStorage;
      setProfile(readStoredProfile(storage));
    } catch {
      setProfile(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let lastTouch = 0;
    /**
     * 세션 읽기 실패와 무관하게 ready를 올려 스코프가 대기 화면에 붙지 않게 한다.
     */
    const hydrate = () => {
      try {
        if (!cancelled) {
          setProfile(readStoredProfile(window.sessionStorage));
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    };
    hydrate();
    const onActivity = (event) => {
      if (event.type === "visibilitychange" && document.visibilityState !== "visible") {
        refresh();
        return;
      }
      const now = Date.now();
      if (now - lastTouch < 5000) {
        return;
      }
      lastTouch = now;
      const next = touchStoredProfile(window.sessionStorage);
      setProfile(next);
    };
    const events = ["pointerdown", "keydown", "visibilitychange"];
    events.forEach((name) => window.addEventListener(name, onActivity));
    const timer = window.setInterval(refresh, 15000);
    return () => {
      cancelled = true;
      events.forEach((name) => window.removeEventListener(name, onActivity));
      window.clearInterval(timer);
    };
  }, [refresh]);

  const save = useCallback((fields) => {
    const result = writeStoredProfile(window.sessionStorage, fields);
    if (result.ok) {
      setProfile(result.profile);
    }
    return result;
  }, []);

  const clear = useCallback(() => {
    clearStoredProfile(window.sessionStorage);
    setProfile(null);
    void fetch("/api/v1/session", {
      method: "DELETE",
      credentials: "include",
      cache: "no-store",
    }).catch(() => {
      /* 서버가 일시 실패해도 로컬 프로필 초기화는 되돌리지 않는다. */
    });
  }, []);

  const value = useMemo(
    () => ({
      profile,
      ready,
      hasSession: Boolean(profile),
      save,
      clear,
    }),
    [profile, ready, save, clear],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionProfile() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSessionProfile requires SessionProvider");
  }
  return ctx;
}
