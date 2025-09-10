import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from './utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, asChild, variant='default', size='md', ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    const base = 'inline-flex items-center justify-center rounded-2xl font-medium transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 shadow-soft'
    const variants = {
      default: 'bg-primary text-white hover:opacity-90',
      outline: 'border border-border bg-white hover:bg-muted',
      ghost: 'hover:bg-muted'
    }[variant]
    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base'
    }[size]
    return <Comp className={cn(base, variants, sizes, className)} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'
