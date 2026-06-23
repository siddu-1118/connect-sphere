'use client';

import React, { useEffect } from 'react';

function reportIncident(reason: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    fetch(`${apiUrl}/auth/report-incident`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason,
        details: {
          url: typeof window !== 'undefined' ? window.location.href : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          timestamp: new Date().toISOString(),
        },
      }),
      // Fire and forget — don't await, don't show anything
    }).catch(() => {});
  } catch (_) {}
}

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Track if we've already reported this session to avoid spamming
    let reported = false;
    const silentReport = (reason: string) => {
      if (reported) return;
      reported = true;
      reportIncident(reason);
    };

    // 1. Block right-click context menu silently
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Block all DevTools keyboard shortcuts silently — no alert, no overlay
    const handleKeyDown = (e: KeyboardEvent) => {
      const blocked =
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
        (e.ctrlKey && ['U', 'u'].includes(e.key)) ||
        (e.ctrlKey && ['S', 's'].includes(e.key));

      if (blocked) {
        e.preventDefault();
        e.stopImmediatePropagation();
        silentReport('DevTools keyboard shortcut attempted: ' + e.key);
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown, true); // capture phase to intercept earliest

    // 3. Detect docked DevTools by window size delta (silent report only, no UI block)
    const checkDimensions = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      if (widthDiff || heightDiff) {
        silentReport('DevTools panel detected via window dimension check');
      }
    };

    const dimensionInterval = setInterval(checkDimensions, 3000);

    // 4. Detect DevTools via debugger timing trick (silent — no overlay)
    const detectDevToolsTiming = () => {
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const elapsed = performance.now() - start;
      if (elapsed > 100) {
        silentReport('DevTools detected via debugger timing');
      }
    };

    const debuggerInterval = setInterval(detectDevToolsTiming, 5000);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown, true);
      clearInterval(dimensionInterval);
      clearInterval(debuggerInterval);
    };
  }, []);

  // No overlay, no UI change — completely transparent to the user
  return <>{children}</>;
}
