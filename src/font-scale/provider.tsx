'use client';

import { createContext, useContext } from 'react';
import type { FontScale } from './config';

const FontScaleContext = createContext<FontScale | null>(null);

export function FontScaleProvider({
  scale,
  children
}: {
  scale: FontScale;
  children: React.ReactNode;
}) {
  return (
    <FontScaleContext.Provider value={scale}>
      {children}
    </FontScaleContext.Provider>
  );
}

export function useFontScale() {
  const scale = useContext(FontScaleContext);
  if (scale === null) {
    throw new Error('useFontScale must be used within FontScaleProvider');
  }
  return scale;
}
