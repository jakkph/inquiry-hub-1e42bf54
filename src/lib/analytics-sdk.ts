/**
 * Privacy-First Analytics SDK
 * Handles anonymized token generation, session lifecycle, and automatic tracking
 */

const STORAGE_KEY = "pfa_token";
const SESSION_KEY = "pfa_session";
const INGEST_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest`;

interface SessionState {
  session_id: string | null;
  started_at: string | null;
  current_page: string;
  section_timers: Map<string, number>;
  scroll_depths: Map<string, number>;
  last_activity: number;
}

interface RageScrollState {
  lastScrollY: number;
  lastDirection: 'up' | 'down' | null;
  directionChanges: number[];
  lastChangeTime: number;
}

interface PauseState {
  lastScrollTime: number;
  pauseTimer: number | null;
  lastPauseTriggered: number;
  accumulatedPause: number;
}

interface SDKConfig {
  scrollThrottleMs?: number;
  dwellIntervalMs?: number;
  inactivityTimeoutMs?: number;
  rageScrollThresholdMs?: number;
  rageScrollMinChanges?: number;
  pauseThresholdMs?: number;
  pauseMinSeconds?: number;
  pauseMaxSeconds?: number;
  debug?: boolean;
}

const DEFAULT_CONFIG: Required<SDKConfig> = {
  scrollThrottleMs: 250,
  dwellIntervalMs: 5000,
  inactivityTimeoutMs: 30 * 60 * 1000, // 30 minutes
  rageScrollThresholdMs: 1500, // Time window to detect rage scrolling
  rageScrollMinChanges: 4, // Minimum direction changes to trigger rage scroll
  pauseThresholdMs: 2000, // Time without scrolling to consider a pause
  pauseMinSeconds: 3, // Minimum pause duration to report
  pauseMaxSeconds: 300, // Maximum pause to report (5 minutes cap)
  debug: false,
};

class AnalyticsSDK {
  private config: Required<SDKConfig>;
  private token: string;
  private state: SessionState;
  private rageState: RageScrollState;
  private pauseState: PauseState;
  private scrollHandler: (() => void) | null = null;
  private rageScrollHandler: (() => void) | null = null;
  private pauseCheckInterval: number | null = null;
  private dwellInterval: number | null = null;
  private initialized = false;

  constructor(config: SDKConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.token = this.getOrCreateToken();
    this.state = {
      session_id: null,
      started_at: null,
      current_page: window.location.pathname,
      section_timers: new Map(),
      scroll_depths: new Map(),
      last_activity: Date.now(),
    };
    this.rageState = {
      lastScrollY: 0,
      lastDirection: null,
      directionChanges: [],
      lastChangeTime: 0,
    };
    this.pauseState = {
      lastScrollTime: Date.now(),
      pauseTimer: null,
      lastPauseTriggered: 0,
      accumulatedPause: 0,
    };
  }

  /**
   * Generate or retrieve anonymized token (non-reversible)
   */
  private getOrCreateToken(): string {
    let token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      token = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem(STORAGE_KEY, token);
    }
    return token;
  }

  /**
   * Get coarse browser family
   */
  private getBrowserFamily(): "chrome" | "firefox" | "safari" | "edge" | "other" {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("edg")) return "edge";
    if (ua.includes("chrome")) return "chrome";
    if (ua.includes("firefox")) return "firefox";
    if (ua.includes("safari")) return "safari";
    return "other";
  }

  /**
   * Get coarse device type
   */
  private getDeviceType(): "desktop" | "mobile" | "tablet" | "other" {
    const ua = navigator.userAgent.toLowerCase();
    if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
    if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return "mobile";
    if (/android|linux|windows|macintosh/i.test(ua)) return "desktop";
    return "other";
  }

  /**
   * Get referrer type
   */
  private getReferrerType(): "direct" | "known_domain" | "unknown" {
    const referrer = document.referrer;
    if (!referrer) return "direct";
    try {
      const url = new URL(referrer);
      if (url.hostname === window.location.hostname) return "direct";
      const knownDomains = ["google.com", "bing.com", "duckduckgo.com", "yahoo.com", "github.com", "linkedin.com", "twitter.com", "facebook.com"];
      if (knownDomains.some((d) => url.hostname.includes(d))) return "known_domain";
    } catch {
      return "unknown";
    }
    return "unknown";
  }

  /**
   * Send event to ingestion endpoint
   */
  private async sendEvent(eventType: string, payload: Record<string, unknown> = {}): Promise<boolean> {
    const body: Record<string, unknown> = {
      event_type: eventType,
      anonymized_token: this.token,
      ...payload,
    };

    if (this.state.session_id && eventType !== "session_start") {
      body.session_id = this.state.session_id;
    }

    if (this.config.debug) {
      console.log("[Analytics]", eventType, body);
    }

    try {
      const response = await fetch(INGEST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        if (this.config.debug) {
          const text = await response.text();
          console.warn("[Analytics] Failed:", response.status, text);
        }
        return false;
      }

      const result = await response.json();
      
      // Capture session_id from session_start response
      if (eventType === "session_start" && result.session_id) {
        this.state.session_id = result.session_id;
        this.state.started_at = new Date().toISOString();
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          session_id: result.session_id,
          started_at: this.state.started_at,
        }));
      }

      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error("[Analytics] Error:", error);
      }
      return false;
    }
  }

  /**
   * Calculate current scroll depth percentage
   */
  private getScrollDepth(): number {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return 100;
    return Math.min(100, Math.round((scrollTop / scrollHeight) * 100));
  }

  /**
   * Throttle function
   */
  private throttle<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
    let lastCall = 0;
    return ((...args: unknown[]) => {
      const now = Date.now();
      if (now - lastCall >= ms) {
        lastCall = now;
        fn(...args);
      }
    }) as T;
  }

  /**
   * Initialize tracking
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // Check for existing session
    const storedSession = sessionStorage.getItem(SESSION_KEY);
    if (storedSession) {
      try {
        const { session_id, started_at } = JSON.parse(storedSession);
        this.state.session_id = session_id;
        this.state.started_at = started_at;
      } catch {
        // Invalid session, start new
      }
    }

    // Start new session if needed
    if (!this.state.session_id) {
      await this.sendEvent("session_start", {
        entry_path: window.location.pathname,
        referrer_type: this.getReferrerType(),
        browser_family: this.getBrowserFamily(),
        device_type: this.getDeviceType(),
      });
    }

    // Set up scroll tracking
    this.scrollHandler = this.throttle(() => {
      const depth = this.getScrollDepth();
      const page = this.state.current_page;
      const prevDepth = this.state.scroll_depths.get(page) || 0;
      
      if (depth > prevDepth) {
        this.state.scroll_depths.set(page, depth);
        // Send scroll_depth event at 25%, 50%, 75%, 100% thresholds
        const thresholds = [25, 50, 75, 100];
        for (const threshold of thresholds) {
          if (depth >= threshold && prevDepth < threshold) {
            this.sendEvent("scroll_depth", {
              page_path: page,
              depth: threshold,
            });
            break;
          }
        }
      }
      
      this.state.last_activity = Date.now();
    }, this.config.scrollThrottleMs);

    window.addEventListener("scroll", this.scrollHandler, { passive: true });

    // Set up rage scroll detection (separate handler for more frequent sampling)
    this.rageScrollHandler = () => {
      const currentY = window.scrollY;
      const now = Date.now();
      
      // Determine scroll direction
      const direction: 'up' | 'down' = currentY > this.rageState.lastScrollY ? 'down' : 'up';
      
      // Detect direction change
      if (this.rageState.lastDirection !== null && direction !== this.rageState.lastDirection) {
        // Filter out old direction changes outside the time window
        const validChanges = this.rageState.directionChanges.filter(
          (t) => now - t < this.config.rageScrollThresholdMs
        );
        validChanges.push(now);
        this.rageState.directionChanges = validChanges;
        
        // Check if we've hit the rage scroll threshold
        if (validChanges.length >= this.config.rageScrollMinChanges) {
          // Calculate intensity based on number of changes (1-10 scale)
          const intensity = Math.min(10, Math.ceil(validChanges.length / 2));
          this.trackRageScroll(intensity);
          
          // Reset to prevent repeated triggers
          this.rageState.directionChanges = [];
          
          if (this.config.debug) {
            console.log("[Analytics] Rage scroll detected!", { intensity, changes: validChanges.length });
          }
        }
      }
      
      this.rageState.lastScrollY = currentY;
      this.rageState.lastDirection = direction;
    };

    window.addEventListener("scroll", this.rageScrollHandler, { passive: true });

    // Set up pause detection (tracks when user stops scrolling to read)
    const resetPauseTimer = () => {
      this.pauseState.lastScrollTime = Date.now();
      
      // If there was an accumulated pause and user scrolls again, send the pause event
      if (this.pauseState.accumulatedPause >= this.config.pauseMinSeconds) {
        const pauseSeconds = Math.min(this.pauseState.accumulatedPause, this.config.pauseMaxSeconds);
        this.trackPause(pauseSeconds);
        
        if (this.config.debug) {
          console.log("[Analytics] Pause detected!", { pauseSeconds });
        }
      }
      this.pauseState.accumulatedPause = 0;
    };

    // Listen for scroll to reset pause timer
    window.addEventListener("scroll", resetPauseTimer, { passive: true });

    // Check for pauses periodically
    this.pauseCheckInterval = window.setInterval(() => {
      const now = Date.now();
      const timeSinceScroll = (now - this.pauseState.lastScrollTime) / 1000;
      
      // If user hasn't scrolled for threshold time, accumulate pause
      if (timeSinceScroll >= this.config.pauseThresholdMs / 1000) {
        this.pauseState.accumulatedPause = timeSinceScroll;
      }
    }, 1000);

    // Set up section dwell tracking
    this.dwellInterval = window.setInterval(() => {
      this.state.section_timers.forEach((startTime, sectionKey) => {
        const dwellSeconds = Math.round((Date.now() - startTime) / 1000);
        if (dwellSeconds >= 5) {
          this.sendEvent("section_dwell", {
            section_key: sectionKey,
            page_path: this.state.current_page,
            dwell_seconds: dwellSeconds,
          });
        }
      });
    }, this.config.dwellIntervalMs);

    // Track page visibility for exit events
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        const depth = this.state.scroll_depths.get(this.state.current_page) || 0;
        if (depth < 25) {
          this.sendEvent("early_exit", {
            page_path: this.state.current_page,
            depth,
          });
        } else {
          this.sendEvent("exit_event", {
            page_path: this.state.current_page,
            depth,
          });
        }
      }
    });

    // Track beforeunload for exit
    window.addEventListener("beforeunload", () => {
      const depth = this.state.scroll_depths.get(this.state.current_page) || 0;
      this.sendEvent("exit_event", {
        page_path: this.state.current_page,
        depth,
      });
    });

    if (this.config.debug) {
      console.log("[Analytics] Initialized", { token: this.token.slice(0, 8) + "...", session: this.state.session_id });
    }
  }

  /**
   * Track page navigation (call on route change)
   */
  trackPageView(path: string): void {
    if (path === this.state.current_page) return;
    
    // Send exit for previous page
    const prevDepth = this.state.scroll_depths.get(this.state.current_page) || 0;
    if (prevDepth < 25) {
      this.sendEvent("early_exit", {
        page_path: this.state.current_page,
        depth: prevDepth,
      });
    }

    // Reset for new page
    this.state.current_page = path;
    this.state.scroll_depths.set(path, 0);
    this.state.section_timers.clear();
  }

  /**
   * Track section enter (for dwell time)
   */
  trackSectionEnter(sectionKey: string): void {
    this.state.section_timers.set(sectionKey, Date.now());
  }

  /**
   * Track section leave (for dwell time)
   */
  trackSectionLeave(sectionKey: string): void {
    const startTime = this.state.section_timers.get(sectionKey);
    if (startTime) {
      const dwellSeconds = Math.round((Date.now() - startTime) / 1000);
      if (dwellSeconds >= 1) {
        this.sendEvent("section_dwell", {
          section_key: sectionKey,
          page_path: this.state.current_page,
          dwell_seconds: dwellSeconds,
        });
      }
      this.state.section_timers.delete(sectionKey);
    }
  }

  /**
   * Track rage scroll (rapid back-and-forth scrolling)
   */
  trackRageScroll(intensity: number = 1): void {
    this.sendEvent("rage_scroll", {
      page_path: this.state.current_page,
      rage_intensity: Math.min(Math.max(intensity, 1), 10),
    });
  }

  /**
   * Track contact intent (form focus, CTA click, etc.)
   */
  trackContactIntent(): void {
    this.sendEvent("contact_intent", {
      page_path: this.state.current_page,
    });
  }

  /**
   * Track pause event (user stopped scrolling)
   */
  trackPause(pauseSeconds: number): void {
    this.sendEvent("pause_event", {
      page_path: this.state.current_page,
      pause_seconds: pauseSeconds,
    });
  }

  /**
   * Cleanup and destroy SDK
   */
  destroy(): void {
    if (this.scrollHandler) {
      window.removeEventListener("scroll", this.scrollHandler);
      this.scrollHandler = null;
    }
    if (this.rageScrollHandler) {
      window.removeEventListener("scroll", this.rageScrollHandler);
      this.rageScrollHandler = null;
    }
    if (this.pauseCheckInterval) {
      clearInterval(this.pauseCheckInterval);
      this.pauseCheckInterval = null;
    }
    if (this.dwellInterval) {
      clearInterval(this.dwellInterval);
      this.dwellInterval = null;
    }
    this.initialized = false;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.state.session_id;
  }

  /**
   * Get anonymized token (first 8 chars only for display)
   */
  getTokenPreview(): string {
    return this.token.slice(0, 8) + "...";
  }
}

// Singleton instance
let instance: AnalyticsSDK | null = null;

export function initAnalytics(config: SDKConfig = {}): AnalyticsSDK {
  if (!instance) {
    instance = new AnalyticsSDK(config);
  }
  return instance;
}

export function getAnalytics(): AnalyticsSDK | null {
  return instance;
}

export { AnalyticsSDK };
export type { SDKConfig };
