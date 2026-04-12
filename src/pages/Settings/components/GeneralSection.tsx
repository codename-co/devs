/**
 * GeneralSection — Settings section for general app preferences.
 *
 * Displays:
 *  - Interface language selector
 *  - Theme selector (system / light / dark)
 *  - Platform name override
 *  - Background image upload
 */

import { Input, Select, SelectItem } from '@heroui/react'
import { Button } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n, useUrl, languages, type Lang } from '@/i18n'
import { userSettings, type ThemeMode } from '@/stores/userStore'
import { PRODUCT } from '@/config/product'
import { useBackgroundImage } from '@/hooks/useBackgroundImage'
import { ColorThemePicker } from '@/components/ColorThemePicker'
import { PptxThemePicker } from '@/components/PptxThemePicker'
import { useHashHighlight } from '@/hooks/useHashHighlight'
import { successToast } from '@/lib/toast'
import { useNavigate, useLocation } from 'react-router-dom'
import localI18n from '../i18n'
import { useSpaceScopedSetting } from '../useSpaceScopedSetting'

export function GeneralSection() {
  const { lang, t } = useI18n(localI18n)
  const navigate = useNavigate()
  const location = useLocation()
  const { handleImageFile, setBackgroundImage: setBackgroundImageGlobal } =
    useBackgroundImage()
  const { getHighlightClasses } = useHashHighlight()

  // Local-only settings
  const setLanguage = userSettings((state) => state.setLanguage)

  // Theme settings — space-scopable
  const _theme = userSettings((state) => state.theme)
  const _setTheme = userSettings((state) => state.setTheme)
  const [theme, setTheme] = useSpaceScopedSetting(
    'theme',
    _theme,
    _setTheme as (v: ThemeMode | undefined) => void,
  )

  const _colorTheme = userSettings((state) => state.colorTheme)
  const _setColorTheme = userSettings((state) => state.setColorTheme)
  const [colorTheme, setColorTheme] = useSpaceScopedSetting(
    'colorTheme',
    _colorTheme,
    _setColorTheme as (v: string | undefined) => void,
  )

  // Synced settings — space-scopable
  const _platformName = userSettings((state) => state.platformName)
  const _setPlatformName = userSettings((state) => state.setPlatformName)
  const [platformName, setPlatformName] = useSpaceScopedSetting(
    'platformName',
    _platformName,
    _setPlatformName as (v: string | undefined) => void,
  )

  const _backgroundImage = userSettings((state) => state.backgroundImage)
  const [backgroundImage, setBackgroundImage] = useSpaceScopedSetting(
    'backgroundImage',
    _backgroundImage,
    setBackgroundImageGlobal as (v: string | undefined) => void,
  )

  const _pptxTheme = userSettings((state) => state.pptxTheme)
  const _setPptxTheme = userSettings((state) => state.setPptxTheme)
  const [pptxTheme, setPptxTheme] = useSpaceScopedSetting(
    'pptxTheme',
    _pptxTheme,
    _setPptxTheme as (v: string | undefined) => void,
  )

  const handleLanguageChange = (newLanguage: Lang) => {
    setLanguage(newLanguage)

    const currentHash = location.hash

    let pathWithoutLang = location.pathname
    if (lang !== 'en') {
      pathWithoutLang = location.pathname.replace(
        new RegExp(`^/${lang}(/|$)`),
        '',
      )
    }

    const buildUrl = useUrl(newLanguage)
    navigate(`${buildUrl(pathWithoutLang)}${currentHash}`, { replace: true })
  }

  return (
    <div data-testid="general-settings" className="space-y-8 space-x-4">
      <Input
        id="platform-name"
        label={t('Platform Name')}
        placeholder={PRODUCT.displayName}
        value={platformName || ''}
        onChange={(e) => setPlatformName(e.target.value)}
        className={getHighlightClasses('platform-name', 'max-w-3xs')}
      />

      <Select
        id="interface-language"
        label={t('Interface Language')}
        selectedKeys={[lang]}
        onSelectionChange={(keys) => {
          const selectedLang = Array.from(keys)[0] as Lang
          if (selectedLang && selectedLang !== lang) {
            handleLanguageChange(selectedLang)
          }
        }}
        className={getHighlightClasses('interface-language', 'max-w-3xs')}
      >
        {Object.entries(languages).map(([key, name]) => (
          <SelectItem key={key} textValue={name}>
            {name}
          </SelectItem>
        ))}
      </Select>

      <div className="space-y-4">
        <Select
          id="theme"
          label={t('Theme')}
          selectedKeys={[theme ?? 'system']}
          onSelectionChange={(keys) => {
            const selectedTheme = Array.from(keys)[0] as
              | 'light'
              | 'dark'
              | 'system'
            if (selectedTheme && selectedTheme !== theme) {
              setTheme(selectedTheme)
            }
          }}
          className={getHighlightClasses('theme', 'max-w-3xs')}
        >
          <SelectItem key="system" textValue={t('System')}>
            {t('System')}
          </SelectItem>
          <SelectItem key="light" textValue={t('Light')}>
            {t('Light')}
          </SelectItem>
          <SelectItem key="dark" textValue={t('Dark')}>
            {t('Dark')}
          </SelectItem>
        </Select>

        <div
          id="color-theme"
          className={getHighlightClasses('color-theme', 'max-w-lg')}
        >
          <p className="text-xs text-default-500 mb-3">
            {t('Choose a color scheme for the interface')}
          </p>
          <ColorThemePicker value={colorTheme} onChange={setColorTheme} />
        </div>

        <div
          id="pptx-theme"
          className={getHighlightClasses('pptx-theme', 'max-w-lg')}
        >
          <p className="text-xs text-default-500 mb-3">
            {t('Presentation theme used for generated PPTX slides')}
          </p>
          <PptxThemePicker value={pptxTheme} onChange={setPptxTheme} />
        </div>
      </div>

      <div
        id="background-image"
        className={getHighlightClasses('background-image', 'p-2 -m-2')}
      >
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <label className="text-sm font-medium text-default-600">
              {t('Background Image')}
            </label>
            <p className="text-xs text-default-500 mb-3">
              {t('Set a custom background image for the home page')}
            </p>
            <div className="flex gap-3 items-center">
              <Button
                variant="flat"
                // color="primary"
                size="sm"
                startContent={<Icon name="PagePlus" className="h-4 w-4" />}
                onPress={() =>
                  document.getElementById('background-image-input')?.click()
                }
              >
                {backgroundImage
                  ? t('Change Background')
                  : t('Upload Background')}
              </Button>
              {backgroundImage && (
                <Button
                  variant="flat"
                  color="danger"
                  size="sm"
                  startContent={<Icon name="Trash" className="h-4 w-4" />}
                  onPress={() => {
                    setBackgroundImage(undefined)
                    successToast(t('Background image removed'))
                  }}
                >
                  {t('Remove')}
                </Button>
              )}
            </div>
          </div>
          {backgroundImage && (
            <img
              src={backgroundImage}
              alt={t('Background Image')}
              className="w-24 h-24 rounded-lg object-cover border border-default-200 shadow-sm shrink-0"
            />
          )}
        </div>
        <input
          type="file"
          id="background-image-input"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (file) {
              await handleImageFile(file)
            }
            e.target.value = ''
          }}
        />
      </div>

      <footer className="flex flex-row gap-3 items-baseline absolute end-0 bottom-0 p-4 text-xs opacity-50 justify-end">
        <span>{PRODUCT.displayName}</span>
        <span>{__APP_VERSION__}</span>
        <time dateTime={new Date(__BUILD_TIME__).toISOString()}>
          {new Date(__BUILD_TIME__).toLocaleString(lang, {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </time>
      </footer>
    </div>
  )
}
