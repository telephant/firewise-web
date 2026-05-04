'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface PageContextValue {
  pageTitle: string | null;
  setPageTitle: (title: string | null) => void;
}

const PageContext = createContext<PageContextValue>({
  pageTitle: null,
  setPageTitle: () => {},
});

export function PageContextProvider({ children }: { children: ReactNode }) {
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  return (
    <PageContext.Provider value={{ pageTitle, setPageTitle }}>
      {children}
    </PageContext.Provider>
  );
}

export function usePageContext() {
  return useContext(PageContext);
}

/** Call in a page to set a dynamic name (e.g. portfolio name) shown in the topbar breadcrumb */
export function useSetPageTitle(title: string | null) {
  const { setPageTitle } = usePageContext();
  useEffect(() => {
    setPageTitle(title);
    return () => setPageTitle(null);
  }, [title, setPageTitle]);
}
