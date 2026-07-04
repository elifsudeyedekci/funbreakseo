'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW kaydı başarısız olursa sessizce devam — uygulama SW'siz de çalışır
      });
    }
  }, []);

  return null;
}
