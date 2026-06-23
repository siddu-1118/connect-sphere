'use client';

import React, { useEffect, useState } from 'react';

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false);
  const [reported, setReported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Disable Right Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);

    // 2. Disable Keyboard Shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        // F12
        e.key === 'F12' ||
        // Ctrl + Shift + I/J/C
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        // Ctrl + U (View Source)
        (e.ctrlKey && (e.key === 'U' || e.key === 'u')) ||
        // Ctrl + S (Save Page)
        (e.ctrlKey && (e.key === 'S' || e.key === 's'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerBlock('Keyboard Shortcut Attempted');
        return false;
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // 3. DevTools Intrusion Detection: Debugger loop + Timing check
    let devtoolsDetectionInterval: NodeJS.Timeout;
    
    const triggerBlock = (reason: string) => {
      setBlocked(true);
      if (!reported) {
        setReported(true);
        // Report to backend
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
        fetch(`${apiUrl}/auth/report-incident`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason,
            details: {
              url: window.location.href,
              userAgent: navigator.userAgent,
              screenSize: `${window.innerWidth}x${window.innerHeight}`,
            },
          }),
        }).catch(err => console.error('Failed to send security alert:', err));
      }
    };

    // Detection using debugger delay check
    const detectDevTools = () => {
      const startTime = performance.now();
      // This debugger statement will pause execution if DevTools is open.
      // If it pauses, the difference between endTime and startTime will exceed the threshold.
      debugger; 
      const endTime = performance.now();
      if (endTime - startTime > 100) {
        triggerBlock('DevTools Debugger Paused');
      }
    };

    // Detection using orientation/size checks
    const checkDimensions = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      if (widthThreshold || heightThreshold) {
        triggerBlock('Docked DevTools Detected');
      }
    };

    // Running checks periodically
    devtoolsDetectionInterval = setInterval(() => {
      detectDevTools();
      checkDimensions();
    }, 1000);

    // Image/Console log getter trick (triggers when console is evaluated/printed)
    const element = new Image();
    Object.defineProperty(element, 'id', {
      get: function() {
        triggerBlock('Console DevTools Log Inspected');
      }
    });
    
    // Continually log to check if it's evaluated
    const logInterval = setInterval(() => {
      console.log('%c', element);
      console.clear();
    }, 1000);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(devtoolsDetectionInterval);
      clearInterval(logInterval);
    };
  }, [reported]);

  if (blocked) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0B0F19',
        color: '#EF4444',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        fontFamily: "'Outfit', sans-serif",
        textAlign: 'center',
        padding: '20px',
      }}>
        <div style={{
          border: '2px solid #EF4444',
          borderRadius: '16px',
          padding: '40px',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          maxWidth: '500px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
        }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '20px' }}>⚠️ SECURITY ALERT</h1>
          <p style={{ color: '#94A3B8', fontSize: '16px', lineHeight: '1.6', marginBottom: '20px' }}>
            Access has been blocked due to a security policy violation (Developer Tools or page inspection detected).
          </p>
          <p style={{ color: '#EF4444', fontSize: '14px', fontWeight: 'bold' }}>
            An incident report has been sent to the administrator.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
