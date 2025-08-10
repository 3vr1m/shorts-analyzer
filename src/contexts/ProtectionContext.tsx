'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ProtectionContextType {
  isUnlocked: boolean;
  checkProtection: (input: string) => boolean;
  unlock: () => void;
}

const ProtectionContext = createContext<ProtectionContextType | undefined>(undefined);

const PROTECTION_KEY = "orospuevlatlarisarmisbizi";
const STORAGE_KEY = "daily_motivation_unlocked";

export function ProtectionProvider({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Check if already unlocked in this session
  useEffect(() => {
    setIsHydrated(true);
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setIsUnlocked(true);
    }
  }, []);

  const checkProtection = (input: string): boolean => {
    if (!isHydrated) return false;
    
    const normalized = input.toLowerCase().trim();
    const isValid = normalized === PROTECTION_KEY.toLowerCase();
    
    if (isValid) {
      setIsUnlocked(true);
      sessionStorage.setItem(STORAGE_KEY, "true");
    }
    
    return isValid;
  };

  const unlock = () => {
    if (!isHydrated) return;
    setIsUnlocked(true);
    sessionStorage.setItem(STORAGE_KEY, "true");
  };

  return (
    <ProtectionContext.Provider value={{ isUnlocked, checkProtection, unlock }}>
      {children}
    </ProtectionContext.Provider>
  );
}

export function useProtection() {
  const context = useContext(ProtectionContext);
  if (context === undefined) {
    // Return a default context for SSR
    if (typeof window === 'undefined') {
      return {
        isUnlocked: false,
        checkProtection: () => false,
        unlock: () => {}
      };
    }
    throw new Error('useProtection must be used within a ProtectionProvider');
  }
  return context;
}

// Helper hook for button protection
export function useButtonProtection() {
  const [isHydrated, setIsHydrated] = useState(false);
  const { isUnlocked } = useProtection();
  
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  const protectedClick = (originalHandler: () => void) => {
    return () => {
      if (!isHydrated) return; // Don't do anything until hydrated
      
      if (!isUnlocked) {
        // Subtle hint without being obvious
        const hints = [
          "🌟 Start your day with motivation first!",
          "💡 Don't forget your daily inspiration!", 
          "✨ Share your purpose for today!",
          "🎯 Set your intention above first!"
        ];
        const randomHint = hints[Math.floor(Math.random() * hints.length)];
        alert(randomHint);
        return;
      }
      originalHandler();
    };
  };

  return { isUnlocked: isHydrated ? isUnlocked : false, protectedClick };
}
