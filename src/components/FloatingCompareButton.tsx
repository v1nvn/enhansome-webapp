import { GitCompare } from 'lucide-react'

interface FloatingCompareButtonProps {
  count: number
  disabled?: boolean
  onClick: () => void
}

export function FloatingCompareButton({
  count,
  disabled = false,
  onClick,
}: FloatingCompareButtonProps) {
  const isEnabled = count >= 2 && !disabled

  return (
    <button
      aria-label={`Compare ${count} selected items`}
      className={`fixed bottom-24 right-4 z-30 flex items-center gap-2 rounded-full px-4 py-3 font-semibold shadow-lg transition-all sm:bottom-6 sm:right-6 ${
        isEnabled
          ? 'bg-primary text-primary-foreground cursor-pointer hover:scale-105 hover:shadow-xl active:scale-95'
          : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
      }`}
      disabled={!isEnabled}
      onClick={isEnabled ? onClick : undefined}
      type="button"
    >
      <GitCompare className="h-5 w-5" />
      <span className="text-sm">Compare</span>
      {count > 0 && (
        <span
          className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${
            isEnabled ? 'bg-primary-foreground/20' : 'bg-muted-foreground/20'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}
