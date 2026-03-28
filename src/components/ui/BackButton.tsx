import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { cn } from '@/lib/utils/cn'

interface BackButtonProps {
  className?: string
  search?: Record<string, unknown>
  text?: string
  to: string
  variant?: 'inline' | 'sticky'
}

export function BackButton({
  to,
  search,
  text = 'Back',
  variant = 'sticky',
  className,
}: BackButtonProps) {
  const linkContent = (
    <>
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      <span>{text}</span>
    </>
  )

  const linkClassName = cn(
    '-ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-primary/5 hover:text-primary',
    className,
  )

  if (variant === 'inline') {
    return (
      <Link className={linkClassName} search={search} to={to}>
        {linkContent}
      </Link>
    )
  }

  return (
    <div className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
        <Link className={linkClassName} search={search} to={to}>
          {linkContent}
        </Link>
      </div>
    </div>
  )
}
