import * as React from 'react'
import { cn } from './utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn('min-h-[80px] w-full rounded-2xl border border-border bg-white p-3 text-sm focus:outline-none focus:ring-2', className)} {...props} />
  )
)
Textarea.displayName = 'Textarea'
