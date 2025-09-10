import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from './utils'

export const Tabs = TabsPrimitive.Root
export const TabsList = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, ...props }, ref) => <TabsPrimitive.List ref={ref} className={cn('inline-flex rounded-2xl bg-muted p-1 gap-1', className)} {...props} />
)
export const TabsTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger ref={ref} className={cn('px-4 py-2 rounded-2xl text-sm data-[state=active]:bg-white data-[state=active]:shadow-soft', className)} {...props} />
  )
)
export const TabsContent = TabsPrimitive.Content
TabsList.displayName = 'TabsList'
TabsTrigger.displayName = 'TabsTrigger'
