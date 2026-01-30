'use client';

import { useEffect } from 'react';

export default function AuthRedirectPage() {
  useEffect(() => {
    // Get return URL from sessionStorage (set before OAuth)
    const returnUrl = sessionStorage.getItem('auth_return_url');
    sessionStorage.removeItem('auth_return_url');

    // Full page navigation to ensure auth state is fresh
    window.location.href = returnUrl || '/dashboard';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
