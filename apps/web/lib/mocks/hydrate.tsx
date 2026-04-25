'use client';

import { type ReactNode, useState } from 'react';
import { type CreateMockStoreOptions, MockStoreContext, createMockStore } from './store';

export interface MockStoreProviderProps extends CreateMockStoreOptions {
  children: ReactNode;
}

export function MockStoreProvider({ children, ...seed }: MockStoreProviderProps) {
  const [store] = useState(() => createMockStore(seed));
  return <MockStoreContext.Provider value={store}>{children}</MockStoreContext.Provider>;
}
