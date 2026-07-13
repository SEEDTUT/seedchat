import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    // Detect our native app
    if (ua.includes('SeedChatApp')) return true;
    // Detect mobile browsers
    if (/Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua)) return true;
    return false;
  });

  useEffect(() => {
    const ua = navigator.userAgent;
    const mobile = ua.includes('SeedChatApp') || /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua);
    setIsMobile(mobile);
  }, []);

  return isMobile;
}
