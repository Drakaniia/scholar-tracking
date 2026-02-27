'use client';

import * as React from 'react';
import { TanStackProvider } from './providers/tanstack-provider';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <TanStackProvider>
            {children}
        </TanStackProvider>
    );
}
