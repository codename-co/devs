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
import { userSettings } from '@/stores/userStore'
import { PRODUCT } from '@/config/product'
import { useBackgroundImage } from '@/hooks/useBackgroundImage'
import { useHashHighlight } from '@/hooks/useHashHighlight'
import { successToast } from '@/lib/toast'
import { useNavigate, useLocation } from 'react-router-dom'
import localI18n from '../i18n'

export function GeneralSection() {
  const { lang, t } = useI18n(localI18n)
  const navigate = useNavigate()
  const location = useLocation()
  const { handleImageFile, setBackgroundImage } = useBackgroundImage()
  const { getHighlightClasses } = useHashHighlight()

  const setLanguage = userSettings((state) => state.setLanguage)
  const theme = userSettings((state) => state.theme)
  const setTheme = userSettings((state) => state.setTheme)
  const platformName = userSettings((state) => state.platformName)
  const setPlatformName = userSettings((state) => state.setPlatformName)
  const backgroundImage = userSettings((state) => state.backgroundImage)

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

      <Select
        id="theme"
        label={t('Theme')}
        selectedKeys={[theme]}
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

      <Input
        id="platform-name"
        label={t('Platform Name')}
        placeholder={PRODUCT.displayName}
        value={platformName || ''}
        onChange={(e) => setPlatformName(e.target.value)}
        className={getHighlightClasses('platform-name', 'max-w-3xs')}
      />

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
    </div>
  )
}
