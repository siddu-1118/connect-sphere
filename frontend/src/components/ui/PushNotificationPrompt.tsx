'use client';

import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import Button from './Button';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only prompt if in browser and push is supported and permission is not already granted/denied
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator
    ) {
      const savedDismiss = localStorage.getItem('push_prompt_dismissed');
      if (Notification.permission === 'default' && !savedDismiss) {
        // Delay showing the prompt slightly for a better user experience
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('✅ Push notification permission granted.');
        
        // Register push subscription
        const registration = await navigator.serviceWorker.ready;
        
        // Fetch VAPID public key from backend
        const keyRes = await api.get('/push/vapid-public-key');
        if (!keyRes.data.success || !keyRes.data.publicKey) {
          throw new Error('Failed to fetch VAPID public key');
        }

        const convertedKey = urlBase64ToUint8Array(keyRes.data.publicKey);

        // Subscribe to push manager
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });

        // Send to backend
        await api.post('/push/subscribe', subscription);
        console.log('✅ Push subscription saved to backend.');
      } else {
        console.warn('⚠️ Push notification permission denied.');
      }
      setShowPrompt(false);
    } catch (err) {
      console.error('❌ Error subscribing to push notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('push_prompt_dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-2xl animate-fade-in-up">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20 text-cyan-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div className="flex-grow">
          <h4 className="text-sm font-semibold text-white">Enable Push Notifications</h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Get instant alerts for incoming calls, direct messages, and scheduled meetings directly on your device.
          </p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleRequestPermission}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center bg-cyan-500 hover:bg-cyan-600 active:scale-98 transition text-slate-950 text-xs font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50 min-h-[44px]"
            >
              {loading ? 'Subscribing...' : 'Allow Alerts'}
            </button>
            <button
              onClick={handleDismiss}
              disabled={loading}
              className="inline-flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-98 transition text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-lg min-h-[44px]"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
