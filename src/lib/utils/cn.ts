import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with clsx.
 * This utility combines conditional class names and resolves Tailwind conflicts.
 *
 * @example
 * cn('px-2 py-1', 'px-4') // => 'py-1 px-4' (px-4 overrides px-2)
 * cn('base-class', isActive && 'active-class', 'other-class')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
