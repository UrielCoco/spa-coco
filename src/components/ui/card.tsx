import * as React from "react"
import { cn } from "@/lib/utils"

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props
  return <div className={cn("shadcn-card", className)} {...rest} />
}

export function CardHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props
  return <div className={cn("p-6", className)} {...rest} />
}
export function CardTitle(props: React.HTMLAttributes<HTMLHeadingElement>) {
  const { className, ...rest } = props
  return <h3 className={cn("text-xl font-semibold tracking-tight", className)} {...rest} />
}
export function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props
  return <div className={cn("p-6 pt-0", className)} {...rest} />
}
export function CardFooter(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props
  return <div className={cn("p-6 pt-0", className)} {...rest} />
}
