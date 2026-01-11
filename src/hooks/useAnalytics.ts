import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { initAnalytics, getAnalytics, SDKConfig } from "@/lib/analytics-sdk";

/**
 * Hook to initialize and use the analytics SDK
 */
export function useAnalytics(config: SDKConfig = {}) {
  const location = useLocation();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      const sdk = initAnalytics(config);
      sdk.init();
      initializedRef.current = true;
    }
  }, [config]);

  // Track page views on route change
  useEffect(() => {
    const sdk = getAnalytics();
    if (sdk) {
      sdk.trackPageView(location.pathname);
    }
  }, [location.pathname]);

  return getAnalytics();
}

/**
 * Hook to track section visibility for dwell time
 */
export function useSectionTracking(sectionKey: string) {
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const sdk = getAnalytics();
    if (!sdk || !sectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            sdk.trackSectionEnter(sectionKey);
          } else {
            sdk.trackSectionLeave(sectionKey);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(sectionRef.current);

    return () => {
      observer.disconnect();
      sdk.trackSectionLeave(sectionKey);
    };
  }, [sectionKey]);

  return sectionRef;
}

/**
 * Hook to track contact intent on form elements
 */
export function useContactIntentTracking() {
  const trackedRef = useRef(false);

  const trackIntent = useCallback(() => {
    if (trackedRef.current) return;
    const sdk = getAnalytics();
    if (sdk) {
      sdk.trackContactIntent();
      trackedRef.current = true;
    }
  }, []);

  return trackIntent;
}
