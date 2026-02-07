import { memo } from 'react'

import { SlidersHorizontal } from 'lucide-react'

interface MobileFilterButtonProps {
  activeCount: number
  onClick: () => void
}

function MobileFilterButton({ activeCount, onClick }: MobileFilterButtonProps) {
  return (
    <div className="fixed bottom-6 right-6 z-40 md:hidden">
      <button
        className="bg-primary text-primary-foreground shadow-primary/30 hover:shadow-primary/50 group relative flex size-14 items-center justify-center rounded-2xl shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
        onClick={onClick}
        type="button"
      >
        <SlidersHorizontal className="h-6 w-6 transition-transform group-hover:rotate-180 group-hover:duration-500" />

        {/* Active filters badge */}
        {activeCount > 0 && (
          <span className="bg-destructive text-destructive-foreground absolute -right-1 -top-1 flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-xs font-bold shadow-md">
            {activeCount > 9 ? '9+' : activeCount}
          </span>
        )}

        {/* Ripple effect */}
        <span className="bg-primary-foreground/20 absolute inset-0 rounded-2xl opacity-0 group-hover:animate-ping" />
      </button>
    </div>
  )
}

export default memo(MobileFilterButton)
