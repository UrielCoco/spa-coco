import * as React from 'react'
import { cn } from './utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn('h-10 w-full rounded-2xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2', className)} {...props} />
  )
)
Input.displayName = 'Input'
