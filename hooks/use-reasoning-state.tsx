
import { useState, useEffect, useCallback, useRef } from 'react';

interface ReasoningState {
  isLoading: boolean;
  isExpanded: boolean;
  showReasoned: boolean;
  isCollapsed: boolean;
  thinkingDuration: number;
  isThinking: boolean;
}

interface WebSearchState {
  isActive: boolean;
  isSearching: boolean;
  results: any[];
  answer?: string;
  query?: string;
  error?: string;
}

// Helper to get stored reasoning data
const getStoredReasoningData = (reasoning: string) => {
  if (typeof window === 'undefined' || !reasoning) return null;
  
  try {
    const stored = sessionStorage.getItem(`reasoning-${btoa(reasoning.slice(0, 50))}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Helper to store reasoning data
const setStoredReasoningData = (reasoning: string, data: { startTime: number; duration: number }) => {
  if (typeof window === 'undefined' || !reasoning) return;
  
  try {
    sessionStorage.setItem(`reasoning-${btoa(reasoning.slice(0, 50))}`, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
};

export function useReasoningState(reasoning: string, isLoading: boolean) {
  const [state, setState] = useState<ReasoningState>({
    isLoading: false,
    isExpanded: false,
    showReasoned: false,
    isCollapsed: false,
    thinkingDuration: 0,
    isThinking: false,
  });

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize state with stored data if available
  useEffect(() => {
    if (reasoning && !isLoading) {
      const storedData = getStoredReasoningData(reasoning);
      if (storedData) {
        setState(prev => ({
          ...prev,
          thinkingDuration: storedData.duration,
          showReasoned: true,
          isExpanded: false,
        }));
      }
    }
  }, [reasoning, isLoading]);

  useEffect(() => {
    if (isLoading && !state.isThinking) {
      // Start reasoning phase and timer
      startTimeRef.current = Date.now();
      setState(prev => ({
        ...prev,
        isLoading: true,
        isExpanded: true,
        showReasoned: false,
        isCollapsed: false,
        isThinking: true,
        thinkingDuration: 0,
      }));

      // Update duration every second while thinking
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setState(prev => ({
            ...prev,
            thinkingDuration: duration,
          }));
        }
      }, 1000);
    } else if (reasoning && !isLoading && state.isThinking) {
      // Reasoning complete - calculate final duration and show result
      const finalDuration = startTimeRef.current 
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : state.thinkingDuration;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Store the reasoning data for persistence
      if (startTimeRef.current) {
        setStoredReasoningData(reasoning, {
          startTime: startTimeRef.current,
          duration: finalDuration
        });
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        showReasoned: true,
        isExpanded: false,
        isThinking: false,
        thinkingDuration: finalDuration,
      }));
      
      // Auto-collapse after 5 seconds
      const collapseTimer = setTimeout(() => {
        setState(prev => ({
          ...prev,
          isExpanded: false,
          showReasoned: false,
          isCollapsed: true,
        }));
      }, 5000);
      
      return () => clearTimeout(collapseTimer);
    }
  }, [isLoading, reasoning, state.isThinking]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const toggleExpanded = useCallback(() => {
    setState(prev => ({
      ...prev,
      isExpanded: !prev.isExpanded,
      showReasoned: false,
    }));
  }, []);

  const forceCollapse = useCallback(() => {
    setState(prev => ({
      ...prev,
      isExpanded: false,
      showReasoned: false,
      isCollapsed: true,
    }));
  }, []);

  return {
    ...state,
    toggleExpanded,
    forceCollapse,
  };
}
