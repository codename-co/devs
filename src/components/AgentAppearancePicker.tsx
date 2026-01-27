import { useState, useMemo, useCallback, memo } from 'react'
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
  Tab,
  Tabs,
  Tooltip,
  ScrollShadow,
} from '@heroui/react'

import { Icon, Icons } from '@/components'
import { IconName } from '@/lib/types'
import { AgentColor } from '@/types'
import { AgentPortraitService } from '@/lib/agent-portrait-service'
import { errorToast } from '@/lib/toast'
import { useI18n } from '@/i18n'

// Local i18n translations
const localI18n = {
  en: [
    'Appearance',
    'Icon & Color',
    'AI Portrait',
    'Agent Name',
    'Agent Role',
    'Icon',
    'Search icons…',
    'No icons found',
    'Choose Icon',
    'Clear Icon',
    'Color',
    'Default',
    'Primary',
    'Secondary',
    'Success',
    'Warning',
    'Danger',
    'Generate Portrait',
    'Regenerate Portrait',
    'Generating…',
    'Remove',
    'Uses AI to generate a unique portrait based on the agent name and role.',
    'Please provide a name and role first',
    'Failed to generate portrait',
    'Switch to use an icon with a color theme',
    'Switch to generate an AI portrait',
  ] as const,
  fr: {
    Appearance: 'Apparence',
    'Icon & Color': 'Icône et couleur',
    'AI Portrait': 'Portrait IA',
    'Agent Name': "Nom de l'agent",
    'Agent Role': "Rôle de l'agent",
    Icon: 'Icône',
    'Search icons…': 'Rechercher des icônes…',
    'No icons found': 'Aucune icône trouvée',
    'Choose Icon': 'Choisir une icône',
    'Clear Icon': "Effacer l'icône",
    Color: 'Couleur',
    Default: 'Défaut',
    Primary: 'Principal',
    Secondary: 'Secondaire',
    Success: 'Succès',
    Warning: 'Avertissement',
    Danger: 'Danger',
    'Generate Portrait': 'Générer un portrait',
    'Regenerate Portrait': 'Régénérer le portrait',
    'Generating…': 'Génération…',
    Remove: 'Supprimer',
    'Uses AI to generate a unique portrait based on the agent name and role.':
      "Utilise l'IA pour générer un portrait unique basé sur le nom et le rôle de l'agent",
    'Please provide a name and role first':
      "Veuillez d'abord fournir un nom et un rôle",
    'Failed to generate portrait': 'Échec de la génération du portrait',
    'Switch to use an icon with a color theme':
      "Passer à l'utilisation d'une icône avec un thème de couleur",
    'Switch to generate an AI portrait':
      "Passer à la génération d'un portrait IA",
  },
  es: {
    Appearance: 'Apariencia',
    'Icon & Color': 'Icono y color',
    'AI Portrait': 'Retrato IA',
    'Agent Name': 'Nombre del agente',
    'Agent Role': 'Rol del agente',
    Icon: 'Icono',
    'Search icons…': 'Buscar iconos…',
    'No icons found': 'No se encontraron iconos',
    'Choose Icon': 'Elegir icono',
    'Clear Icon': 'Borrar icono',
    Color: 'Color',
    Default: 'Predeterminado',
    Primary: 'Primario',
    Secondary: 'Secundario',
    Success: 'Éxito',
    Warning: 'Advertencia',
    Danger: 'Peligro',
    'Generate Portrait': 'Generar retrato',
    'Regenerate Portrait': 'Regenerar retrato',
    'Generating…': 'Generando…',
    Remove: 'Eliminar',
    'Uses AI to generate a unique portrait based on the agent name and role.':
      'Utiliza IA para generar un retrato único basado en el nombre y el rol del agente',
    'Please provide a name and role first':
      'Por favor, proporcione primero un nombre y un rol',
    'Failed to generate portrait': 'Error al generar el retrato',
    'Switch to use an icon with a color theme':
      'Cambiar a usar un icono con un tema de color',
    'Switch to generate an AI portrait': 'Cambiar a generar un retrato IA',
  },
  de: {
    Appearance: 'Erscheinungsbild',
    'Icon & Color': 'Symbol und Farbe',
    'AI Portrait': 'KI-Porträt',
    'Agent Name': 'Agentenname',
    'Agent Role': 'Agentenrolle',
    Icon: 'Symbol',
    'Search icons…': 'Symbole suchen…',
    'No icons found': 'Keine Symbole gefunden',
    'Choose Icon': 'Symbol wählen',
    'Clear Icon': 'Symbol löschen',
    Color: 'Farbe',
    Default: 'Standard',
    Primary: 'Primär',
    Secondary: 'Sekundär',
    Success: 'Erfolg',
    Warning: 'Warnung',
    Danger: 'Gefahr',
    'Generate Portrait': 'Porträt generieren',
    'Regenerate Portrait': 'Porträt neu generieren',
    'Generating…': 'Generieren…',
    Remove: 'Entfernen',
    'Uses AI to generate a unique portrait based on the agent name and role.':
      'Verwendet KI, um basierend auf dem Agentennamen und der Rolle ein einzigartiges Porträt zu erstellen.',
    'Please provide a name and role first':
      'Bitte geben Sie zuerst einen Namen und eine Rolle an',
    'Failed to generate portrait': 'Porträtgenerierung fehlgeschlagen',
    'Switch to use an icon with a color theme':
      'Wechseln Sie zu einem Symbol mit Farbthema',
    'Switch to generate an AI portrait':
      'Wechseln Sie zur Generierung eines KI-Porträts',
  },
  ar: {
    Appearance: 'المظهر',
    'Icon & Color': 'الأيقونة واللون',
    'AI Portrait': 'صورة الذكاء الاصطناعي',
    'Agent Name': 'اسم الوكيل',
    'Agent Role': 'دور الوكيل',
    Icon: 'أيقونة',
    'Search icons…': 'البحث عن الأيقونات…',
    'No icons found': 'لم يتم العثور على أيقونات',
    'Choose Icon': 'اختر أيقونة',
    'Clear Icon': 'مسح الأيقونة',
    Color: 'اللون',
    Default: 'افتراضي',
    Primary: 'أساسي',
    Secondary: 'ثانوي',
    Success: 'نجاح',
    Warning: 'تحذير',
    Danger: 'خطر',
    'Generate Portrait': 'إنشاء صورة',
    'Regenerate Portrait': 'إعادة إنشاء الصورة',
    'Generating…': 'جاري الإنشاء…',
    Remove: 'إزالة',
    'Uses AI to generate a unique portrait based on the agent name and role.':
      'يستخدم الذكاء الاصطناعي لإنشاء صورة فريدة بناءً على اسم الوكيل ودوره.',
    'Please provide a name and role first': 'يرجى تقديم اسم ودور أولاً',
    'Failed to generate portrait': 'فشل في إنشاء الصورة',
    'Switch to use an icon with a color theme':
      'التبديل لاستخدام أيقونة مع سمة لون',
    'Switch to generate an AI portrait':
      'التبديل لإنشاء صورة بالذكاء الاصطناعي',
  },
  ko: {
    Appearance: '외관',
    'Icon & Color': '아이콘 및 색상',
    'AI Portrait': 'AI 초상화',
    'Agent Name': '에이전트 이름',
    'Agent Role': '에이전트 역할',
    Icon: '아이콘',
    'Search icons…': '아이콘 검색…',
    'No icons found': '아이콘을 찾을 수 없습니다',
    'Choose Icon': '아이콘 선택',
    'Clear Icon': '아이콘 지우기',
    Color: '색상',
    Default: '기본',
    Primary: '기본',
    Secondary: '보조',
    Success: '성공',
    Warning: '경고',
    Danger: '위험',
    'Generate Portrait': '초상화 생성',
    'Regenerate Portrait': '초상화 재생성',
    'Generating…': '생성 중…',
    Remove: '제거',
    'Uses AI to generate a unique portrait based on the agent name and role.':
      '에이전트 이름과 역할을 기반으로 고유한 초상화를 생성하는 데 AI를 사용합니다.',
    'Please provide a name and role first': '먼저 이름과 역할을 제공해 주세요',
    'Failed to generate portrait': '초상화 생성 실패',
    'Switch to use an icon with a color theme':
      '색상 테마가 있는 아이콘 사용으로 전환',
    'Switch to generate an AI portrait': 'AI 초상화 생성으로 전환',
  },
}

// Color label keys matching localI18n
type ColorLabelKey =
  | 'Default'
  | 'Primary'
  | 'Secondary'
  | 'Success'
  | 'Warning'
  | 'Danger'

// Available agent colors
const AGENT_COLORS: {
  value: AgentColor
  labelKey: ColorLabelKey
  className: string
}[] = [
  { value: 'default', labelKey: 'Default', className: 'bg-default-500' },
  { value: 'primary', labelKey: 'Primary', className: 'bg-primary' },
  { value: 'secondary', labelKey: 'Secondary', className: 'bg-secondary' },
  { value: 'success', labelKey: 'Success', className: 'bg-success' },
  { value: 'warning', labelKey: 'Warning', className: 'bg-warning' },
  { value: 'danger', labelKey: 'Danger', className: 'bg-danger' },
]

// Curated list of commonly used icons (for faster initial load)
const POPULAR_ICONS: IconName[] = [
  'User',
  'Brain',
  'Code',
  'Book',
  'LightBulbOn',
  'ChatBubble',
  'Palette',
  'Sparks',
  'Camera',
  'Star',
  'Heart',
  'Shield',
  'Rocket',
  'Trophy',
  'Crown',
  'Puzzle',
  'Settings',
  'Search',
  'Mail',
  'Calendar',
  'Clock',
  'Database',
  'Server',
  'Terminal',
  'Strategy',
]

// Memoize icon list to avoid recomputing on every render
const ALL_ICON_NAMES = Object.keys(Icons) as IconName[]

// Memoized icon button component for performance
const IconButton = memo(
  ({
    iconName,
    isSelected,
    onSelect,
  }: {
    iconName: IconName
    isSelected: boolean
    onSelect: (name: IconName) => void
  }) => (
    <Tooltip content={iconName} delay={500} closeDelay={0}>
      <Button
        isIconOnly
        size="sm"
        variant={isSelected ? 'solid' : 'light'}
        color={isSelected ? 'primary' : 'default'}
        onPress={() => onSelect(iconName)}
        aria-label={iconName}
      >
        <Icon name={iconName} className="w-4 h-4" />
      </Button>
    </Tooltip>
  ),
)

IconButton.displayName = 'IconButton'

interface AgentAppearancePickerProps {
  icon?: IconName
  color?: AgentColor
  portrait?: string
  name: string
  role: string
  instructions?: string
  onIconChange?: (icon: IconName | undefined) => void
  onColorChange?: (color: AgentColor | undefined) => void
  onPortraitChange?: (portrait: string | undefined) => void
  isDisabled?: boolean
  showPortraitOption?: boolean
}

type AppearanceMode = 'icon-color' | 'portrait'

export const AgentAppearancePicker = ({
  icon,
  color = 'default',
  portrait,
  name,
  role,
  instructions,
  onIconChange,
  onColorChange,
  onPortraitChange,
  isDisabled = false,
  showPortraitOption = true,
}: AgentAppearancePickerProps) => {
  const { t } = useI18n(localI18n)

  // Determine initial mode based on current state
  const initialMode: AppearanceMode = portrait ? 'portrait' : 'icon-color'
  const [mode, setMode] = useState<AppearanceMode>(initialMode)
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false)
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
  const [iconSearch, setIconSearch] = useState('')

  // Filter icons based on search
  const filteredIcons = useMemo(() => {
    if (!iconSearch.trim()) {
      // Show popular icons first, then the rest
      const popularSet = new Set(POPULAR_ICONS)
      const others = ALL_ICON_NAMES.filter((name) => !popularSet.has(name))
      return [
        ...POPULAR_ICONS.filter((name) => ALL_ICON_NAMES.includes(name)),
        ...others,
      ]
    }
    const searchLower = iconSearch.toLowerCase()
    return ALL_ICON_NAMES.filter((name) =>
      name.toLowerCase().includes(searchLower),
    )
  }, [iconSearch])

  // Limit displayed icons for performance
  const displayedIcons = useMemo(() => {
    return filteredIcons.slice(0, 120)
  }, [filteredIcons])

  const handleModeChange = useCallback(
    (key: React.Key) => {
      const newMode = key as AppearanceMode
      setMode(newMode)

      // Clear the other mode's data when switching
      if (newMode === 'icon-color' && portrait) {
        onPortraitChange?.(undefined)
      } else if (newMode === 'portrait' && (icon || color !== 'default')) {
        // Optionally clear icon when switching to portrait mode
        // onIconChange?.(undefined)
        // onColorChange?.('default')
      }
    },
    [portrait, icon, color, onPortraitChange],
  )

  const handleGeneratePortrait = async () => {
    if (!name || !role) {
      errorToast(t('Please provide a name and role first'))
      return
    }

    setIsGeneratingPortrait(true)
    try {
      const result = await AgentPortraitService.generatePortrait({
        name,
        role,
        instructions: instructions || '',
      })

      if (result.success && result.portrait) {
        onPortraitChange?.(result.portrait)
      } else {
        errorToast(result.error || t('Failed to generate portrait'))
      }
    } catch (error) {
      console.error('Failed to generate portrait:', error)
      errorToast(t('Failed to generate portrait'))
    } finally {
      setIsGeneratingPortrait(false)
    }
  }

  const handleRemovePortrait = () => {
    onPortraitChange?.(undefined)
  }

  const handleIconSelect = useCallback(
    (iconName: IconName) => {
      onIconChange?.(iconName)
      setIsIconPickerOpen(false)
      setIconSearch('')
    },
    [onIconChange],
  )

  return (
    <div className="space-y-4">
      {/* Mode Tabs */}
      {showPortraitOption ? (
        <Tabs
          aria-label={t('Appearance')}
          selectedKey={mode}
          onSelectionChange={handleModeChange}
          variant="light"
          size="sm"
          fullWidth
          isDisabled={isDisabled}
          classNames={{
            tabList: 'gap-2',
          }}
        >
          <Tab
            key="icon-color"
            title={
              <div className="flex items-center gap-2">
                <Icon name="Palette" className="w-4 h-4" />
                <span>{t('Icon & Color')}</span>
              </div>
            }
          >
            <div className="pt-4 space-y-4">
              {/* Icon Picker */}
              <div>
                <label className="text-sm font-medium text-default-700 mb-2 block">
                  {t('Icon')}
                </label>
                <Popover
                  isOpen={isIconPickerOpen}
                  onOpenChange={(open) => {
                    setIsIconPickerOpen(open)
                    if (!open) setIconSearch('')
                  }}
                  placement="bottom-start"
                >
                  <PopoverTrigger>
                    <Button
                      variant="bordered"
                      size="sm"
                      isDisabled={isDisabled}
                      startContent={
                        icon ? <Icon name={icon} className="w-4 h-4" /> : null
                      }
                    >
                      {icon || t('Choose Icon')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="p-2 space-y-2">
                      {/* Search Input */}
                      <Input
                        size="sm"
                        placeholder={t('Search icons…')}
                        value={iconSearch}
                        onValueChange={setIconSearch}
                        startContent={
                          <Icon
                            name="Search"
                            className="w-4 h-4 text-default-400"
                          />
                        }
                        isClearable
                        onClear={() => setIconSearch('')}
                        autoFocus
                      />

                      {/* Icon Grid with Scroll */}
                      <ScrollShadow className="max-h-64">
                        {displayedIcons.length > 0 ? (
                          <div className="grid grid-cols-8 gap-1">
                            {displayedIcons.map((iconName) => (
                              <IconButton
                                key={iconName}
                                iconName={iconName}
                                isSelected={icon === iconName}
                                onSelect={handleIconSelect}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-default-400 text-center py-4">
                            {t('No icons found')}
                          </p>
                        )}
                      </ScrollShadow>

                      {/* Show count if filtered */}
                      {iconSearch && filteredIcons.length > 120 && (
                        <p className="text-xs text-default-400 text-center">
                          Showing 120 of {filteredIcons.length} icons
                        </p>
                      )}

                      {/* Clear Button */}
                      {icon && (
                        <Button
                          size="sm"
                          variant="light"
                          className="w-full"
                          onPress={() => {
                            onIconChange?.(undefined)
                            setIsIconPickerOpen(false)
                            setIconSearch('')
                          }}
                        >
                          {t('Clear Icon')}
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Color Picker */}
              <div>
                <label className="text-sm font-medium text-default-700 mb-2 block">
                  {t('Color')}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {AGENT_COLORS.map((c) => (
                    <Tooltip key={c.value} content={t(c.labelKey)} delay={300}>
                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => onColorChange?.(c.value)}
                        aria-label={t(c.labelKey)}
                        className={`w-8 h-8 rounded-full ${c.className} transition-all ${
                          color === c.value
                            ? 'ring-2 ring-offset-2 ring-primary scale-110'
                            : 'hover:scale-105'
                        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      />
                    </Tooltip>
                  ))}
                </div>
              </div>
            </div>
          </Tab>

          <Tab
            key="portrait"
            title={
              <div className="flex items-center gap-2">
                <Icon name="Sparks" className="w-4 h-4" />
                <span>{t('AI Portrait')}</span>
              </div>
            }
          >
            <div className="pt-4 space-y-3 items-center flex flex-col">
              <div className="aspect-square w-64 rounded-full">
                {portrait ? (
                  <img
                    src={`data:image/png;base64,${portrait}`}
                    alt={name}
                    className="w-full h-full rounded-full"
                  />
                ) : (
                  <Icon
                    name={icon ?? 'User'}
                    className="w-full h-full rounded-full"
                  />
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="bordered"
                  onPress={handleGeneratePortrait}
                  isDisabled={
                    isDisabled || isGeneratingPortrait || !name || !role
                  }
                  startContent={
                    isGeneratingPortrait ? (
                      <Spinner size="sm" />
                    ) : (
                      <Icon name="Sparks" className="w-4 h-4" />
                    )
                  }
                >
                  {isGeneratingPortrait
                    ? t('Generating…')
                    : portrait
                      ? t('Regenerate Portrait')
                      : t('Generate Portrait')}
                </Button>
                {portrait && (
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={handleRemovePortrait}
                    isDisabled={isDisabled}
                  >
                    {t('Remove')}
                  </Button>
                )}
              </div>
              <p className="text-xs text-default-400">
                {t(
                  'Uses AI to generate a unique portrait based on the agent name and role.',
                )}
              </p>
            </div>
          </Tab>
        </Tabs>
      ) : (
        /* Simple Icon & Color picker when portrait option is hidden */
        <div className="space-y-4">
          {/* Icon Picker */}
          <div>
            <label className="text-sm font-medium text-default-700 mb-2 block">
              {t('Icon')}
            </label>
            <Popover
              isOpen={isIconPickerOpen}
              onOpenChange={(open) => {
                setIsIconPickerOpen(open)
                if (!open) setIconSearch('')
              }}
              placement="bottom-start"
            >
              <PopoverTrigger>
                <Button
                  variant="bordered"
                  size="sm"
                  isDisabled={isDisabled}
                  startContent={
                    icon ? <Icon name={icon} className="w-4 h-4" /> : null
                  }
                >
                  {icon || t('Choose Icon')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="p-2 space-y-2">
                  <Input
                    size="sm"
                    placeholder={t('Search icons…')}
                    value={iconSearch}
                    onValueChange={setIconSearch}
                    startContent={
                      <Icon
                        name="Search"
                        className="w-4 h-4 text-default-400"
                      />
                    }
                    isClearable
                    onClear={() => setIconSearch('')}
                    autoFocus
                  />

                  <ScrollShadow className="max-h-64">
                    {displayedIcons.length > 0 ? (
                      <div className="grid grid-cols-8 gap-1">
                        {displayedIcons.map((iconName) => (
                          <IconButton
                            key={iconName}
                            iconName={iconName}
                            isSelected={icon === iconName}
                            onSelect={handleIconSelect}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-default-400 text-center py-4">
                        {t('No icons found')}
                      </p>
                    )}
                  </ScrollShadow>

                  {icon && (
                    <Button
                      size="sm"
                      variant="light"
                      className="w-full"
                      onPress={() => {
                        onIconChange?.(undefined)
                        setIsIconPickerOpen(false)
                        setIconSearch('')
                      }}
                    >
                      {t('Clear Icon')}
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Color Picker */}
          <div>
            <label className="text-sm font-medium text-default-700 mb-2 block">
              {t('Color')}
            </label>
            <div className="flex gap-2 flex-wrap">
              {AGENT_COLORS.map((c) => (
                <Tooltip key={c.value} content={t(c.labelKey)} delay={300}>
                  <button
                    type="button"
                    disabled={isDisabled}
                    onClick={() => onColorChange?.(c.value)}
                    aria-label={t(c.labelKey)}
                    className={`w-8 h-8 rounded-full ${c.className} transition-all ${
                      color === c.value
                        ? 'ring-2 ring-offset-2 ring-primary scale-110'
                        : 'hover:scale-105'
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  />
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AgentAppearancePicker
