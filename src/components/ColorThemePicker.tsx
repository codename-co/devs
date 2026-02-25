/**
 * ColorThemePicker — visual grid of color-theme swatches.
 *
 * Each swatch shows the theme's primary + background color.
 * Selecting a swatch updates the user store and immediately applies
 * CSS custom properties via Providers.tsx.
 */

import { COLOR_THEMES, isThemeDark } from '@/lib/themes'
import { userSettings } from '@/stores/userStore'
import { Icon } from '@/components'
import clsx from 'clsx'

export function ColorThemePicker() {
  const colorTheme = userSettings((state) => state.colorTheme)
  const setColorTheme = userSettings((state) => state.setColorTheme)

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
      {COLOR_THEMES.map((theme) => {
        const isActive = theme.id === colorTheme
        const dark = isThemeDark(theme)

        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => setColorTheme(theme.id)}
            className={clsx(
              'relative flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all cursor-pointer',
              'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary',
              isActive
                ? 'ring-2 ring-primary bg-default-100'
                : 'hover:bg-default-50',
            )}
          >
            {/* Color swatch */}
            <div
              className="w-10 h-10 rounded-lg overflow-hidden border border-default-200 shadow-sm flex"
              style={{ backgroundColor: theme.preview[1] }}
            >
              <div
                className="w-1/2 h-full"
                style={{ backgroundColor: theme.preview[0] }}
              />
            </div>

            {/* Label */}
            <span className="text-[11px] font-medium text-default-600 truncate max-w-full leading-tight">
              {theme.label}
            </span>

            {/* Active indicator */}
            {isActive && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <Icon name="Check" size="sm" className="text-white" />
              </div>
            )}

            {/* Dark badge */}
            {dark && (
              <div className="absolute top-0.5 left-0.5">
                <Icon name="HalfMoon" size="sm" className="text-default-400" />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
