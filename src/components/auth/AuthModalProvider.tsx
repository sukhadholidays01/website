"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

import { LoginModal } from "@/components/auth/LoginModal";

interface AuthModalContextValue {
  openLoginModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);
const dismissalStorageKey = "sukhad-holidays-account-prompt-dismissed";

function hasDismissedFirstVisitPrompt(): boolean {
  try {
    return window.localStorage.getItem(dismissalStorageKey) === "true";
  } catch {
    return false;
  }
}

function rememberFirstVisitDismissal(): void {
  try {
    window.localStorage.setItem(dismissalStorageKey, "true");
  } catch {
    // The modal remains dismissible when browser storage is unavailable.
  }
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let isActive = true;

    window.queueMicrotask(() => {
      if (isActive && !hasDismissedFirstVisitPrompt()) {
        setIsOpen(true);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  function openLoginModal() {
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setIsOpen(true);
  }

  function dismissLoginModal() {
    rememberFirstVisitDismissal();
    setIsOpen(false);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  }

  return (
    <AuthModalContext.Provider value={{ openLoginModal }}>
      {children}
      <LoginModal isOpen={isOpen} onDismiss={dismissLoginModal} />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): AuthModalContextValue {
  const context = useContext(AuthModalContext);
  if (!context) throw new Error("useAuthModal must be used within AuthModalProvider.");
  return context;
}
