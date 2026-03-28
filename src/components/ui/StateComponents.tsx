import { type ButtonHTMLAttributes, type ReactNode } from 'react'

import { FileX, SearchX } from 'lucide-react'

import { cn } from '@/lib/utils/cn'

type Size = 'full' | 'lg' | 'md' | 'sm' | 'xl'

const sizeClasses: Record<Size, string> = {
  sm: 'min-h-[200px]',
  md: 'min-h-[300px]',
  lg: 'min-h-[400px]',
  xl: 'min-h-[500px]',
  full: 'min-h-screen',
}

const iconSizes: Record<Size, string> = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-20 w-20',
  full: 'h-24 w-24',
}

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

interface BaseStateProps {
  children?: ReactNode
  className?: string
  size?: Size
}

interface EmptyStateProps extends BaseStateProps, StateContentProps {}

interface NotFoundStateProps extends BaseStateProps, StateContentProps {}

interface StateContentProps {
  action?: ReactNode
  description?: string
  icon?: ReactNode
  title: string
}

export function ActionButton({
  children,
  className,
  ...rest
}: ActionButtonProps) {
  return (
    <button
      className={cn('text-sm text-primary hover:underline', className)}
      type="button"
      {...rest}
    >
      {children}
    </button>
  )
}

export function EmptyState({
  size = 'lg',
  className,
  icon,
  title,
  description,
  action,
  ...rest
}: EmptyStateProps) {
  const defaultIcon = icon || <FileX className={iconSizes[size]} />

  return (
    <div
      className={cn(
        'animate-fade-in flex items-center justify-center',
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      <StateContent
        action={action}
        description={description}
        icon={defaultIcon}
        title={title}
      />
    </div>
  )
}

export function NotFoundState({
  size = 'full',
  className,
  icon,
  title,
  description,
  action,
  ...rest
}: NotFoundStateProps) {
  const defaultIcon = icon || <SearchX className={iconSizes[size]} />

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-background',
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      <StateContent
        action={action}
        description={description}
        icon={defaultIcon}
        title={title}
      />
    </div>
  )
}

function StateContent({ icon, title, description, action }: StateContentProps) {
  return (
    <div className="text-center">
      {icon != null && (
        <div className="mx-auto mb-4 text-muted-foreground">{icon}</div>
      )}
      <h2 className="font-display font-bold text-foreground">{title}</h2>
      {description && (
        <p className="mt-2 text-muted-foreground">{description}</p>
      )}
      {action != null && <div className="mt-4">{action}</div>}
    </div>
  )
}
