import { Flame, Sparkles, Star, TrendingUp } from 'lucide-react'

import { type FilterPreset, PRESET_CONFIGS } from '@/lib/filter-presets'

const PRESET_ICONS: Record<FilterPreset, React.ReactNode> = {
  trending: <TrendingUp className="h-4 w-4" />,
  popular: <Star className="h-4 w-4" />,
  fresh: <Sparkles className="h-4 w-4" />,
  active: <Flame className="h-4 w-4" />,
}

interface FilterPresetBadgeProps {
  isActive: boolean
  onClick: () => void
  preset: FilterPreset
}

export function FilterPresetBadge({
  isActive,
  onClick,
  preset,
}: FilterPresetBadgeProps) {
  const config = PRESET_CONFIGS[preset]

  return (
    <button
      className={`group relative flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 font-semibold transition-all duration-200 ${
        isActive
          ? 'border-primary bg-primary text-primary-foreground shadow-md'
          : 'border-border/30 bg-card/80 hover:border-primary/50 hover:bg-primary/10 text-foreground'
      } `}
      onClick={onClick}
      title={config.description}
      type="button"
    >
      <span
        className={`transition-transform group-hover:scale-110 ${isActive ? 'text-primary-foreground' : 'text-primary'}`}
      >
        {PRESET_ICONS[preset]}
      </span>
      <span>{config.label}</span>
      {isActive && <span className="ml-1 text-xs opacity-80">active</span>}
    </button>
  )
}
