/**
 * PptxThemePicker — visual grid for selecting the PPTX presentation theme.
 *
 * Shows an "Auto" option that inherits the current color theme,
 * plus all platform color themes as explicit overrides.
 */

import { PPTX_THEMES, PPTX_THEME_AUTO } from '@/lib/pptx-themes'
import { userSettings } from '@/stores/userStore'
import { Icon } from '@/components'
import clsx from 'clsx'

export function PptxThemePicker() {
  const pptxTheme = userSettings((s) => s.pptxTheme) ?? PPTX_THEME_AUTO
  const setPptxTheme = userSettings((s) => s.setPptxTheme)

  const isAutoActive = pptxTheme === PPTX_THEME_AUTO

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
      {/* Auto option */}
      <button
        type="button"
        onClick={() => setPptxTheme(PPTX_THEME_AUTO)}
        className={clsx(
          'relative flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all cursor-pointer',
          'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary',
          isAutoActive
            ? 'ring-2 ring-primary bg-default-100'
            : 'hover:bg-default-50',
        )}
      >
        <div className="w-10 h-10 rounded-lg border border-default-200 shadow-sm flex items-center justify-center bg-default-100">
          <Icon name="Sparks" size="sm" className="text-default-500" />
        </div>
        <span className="text-[11px] font-medium text-default-600 truncate max-w-full leading-tight">
          Auto
        </span>
        {isAutoActive && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
            <Icon name="Check" size="sm" className="text-white" />
          </div>
        )}
      </button>

      {/* Explicit theme options */}
      {PPTX_THEMES.map((theme) => {
        const isActive = theme.id === pptxTheme
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => setPptxTheme(theme.id)}
            className={clsx(
              'relative flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all cursor-pointer',
              'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary',
              isActive
                ? 'ring-2 ring-primary bg-default-100'
                : 'hover:bg-default-50',
            )}
          >
            {/* Mini slide swatch: accent bg (left) + content bg (right) */}
            <div
              className="w-10 h-10 rounded-lg overflow-hidden border border-default-200 shadow-sm flex"
              style={{ backgroundColor: `#${theme.contentBg}` }}
            >
              <div
                className="w-1/2 h-full"
                style={{ backgroundColor: `#${theme.accentBg}` }}
              />
            </div>

            <span className="text-[11px] font-medium text-default-600 truncate max-w-full leading-tight">
              {theme.label}
            </span>

            {isActive && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <Icon name="Check" size="sm" className="text-white" />
              </div>
            )}

            {theme.isDark && (
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
