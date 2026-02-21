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
      className={`duration-250 fixed bottom-6 right-6 z-30 inline-flex items-center gap-2.5 rounded-full px-5 py-3 font-semibold shadow-xl transition-all ${
        isEnabled
          ? 'from-primary to-primary/90 text-primary-foreground cursor-pointer bg-gradient-to-br hover:scale-105 hover:shadow-2xl active:scale-95'
          : 'bg-muted text-muted-foreground cursor-not-allowed'
      }`}
      disabled={!isEnabled}
      onClick={isEnabled ? onClick : undefined}
      type="button"
    >
      <GitCompare className="h-5 w-5" />
      <span className="text-sm">Compare</span>
      {count > 0 && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            isEnabled ? 'bg-primary-foreground/20' : 'bg-muted-foreground/20'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}
