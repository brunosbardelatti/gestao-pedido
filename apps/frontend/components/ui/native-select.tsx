import * as React from 'react';

import { cn } from '@/lib/utils';

const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<'select'>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
NativeSelect.displayName = 'NativeSelect';

export { NativeSelect };
