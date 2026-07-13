import { useState } from 'react';

export function useIsMobile() {
  const [isMobile] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    // Only detect our native app, NOT mobile browsers
    return navigator.userAgent.includes('SeedChatApp');
  });
  return isMobile;
}
