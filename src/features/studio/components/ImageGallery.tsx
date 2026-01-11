/**
 * ImageGallery Component
 *
 * Gallery view for displaying generated images.
 */

import { Button, Tabs, Tab, Chip, Spinner } from '@heroui/react'
import { useMemo } from 'react'

import { Icon } from '@/components/Icon'
import { type Lang, useI18n } from '@/i18n'
import { GeneratedImage, StudioEntry } from '../types'
import { GeneratedImageCard } from './GeneratedImageCard'

interface ImageGalleryProps {
  lang: Lang
  /** Current session images */
  images: GeneratedImage[]
  /** Historical entries */
  history?: StudioEntry[]
  /** Whether history is loading */
  isLoadingHistory?: boolean
  /** Selected image IDs */
  selectedImageIds?: string[]
  /** Toggle image selection */
  onSelectImage?: (imageId: string) => void
  /** Download image */
  onDownloadImage?: (image: GeneratedImage) => void
  /** Delete image */
  onDeleteImage?: (imageId: string) => void
  /** Use image as reference */
  onUseAsReference?: (image: GeneratedImage) => void
  /** Toggle favorite on history entry */
  onToggleFavorite?: (entryId: string) => void
  /** Clear all images */
  onClearAll?: () => void
  /** View mode */
  viewMode?: 'grid' | 'list' | 'masonry'
  /** Change view mode */
  onViewModeChange?: (mode: 'grid' | 'list' | 'masonry') => void
}

export function ImageGallery({
  lang,
  images,
  history = [],
  isLoadingHistory = false,
  selectedImageIds = [],
  onSelectImage,
  onDownloadImage,
  onDeleteImage,
  onUseAsReference,
  onToggleFavorite,
  onClearAll,
  viewMode = 'grid',
  onViewModeChange,
}: ImageGalleryProps) {
  const { t } = useI18n(lang as any)

  // Separate favorites
  const favorites = useMemo(
    () => history.filter((entry) => entry.isFavorite),
    [history],
  )

  const hasImages = images.length > 0 || history.length > 0

  if (!hasImages) {
    return null
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with tabs and actions */}
      <div className="flex items-center justify-between mb-4">
        <Tabs size="sm" variant="underlined" aria-label="Gallery tabs">
          <Tab
            key="current"
            title={
              <span className="flex items-center gap-2">
                {t('Current')}
                {images.length > 0 && (
                  <Chip size="sm" variant="flat">
                    {images.length}
                  </Chip>
                )}
              </span>
            }
          />
          <Tab
            key="history"
            title={
              <span className="flex items-center gap-2">
                {t('History')}
                {history.length > 0 && (
                  <Chip size="sm" variant="flat">
                    {history.length}
                  </Chip>
                )}
              </span>
            }
          />
          {favorites.length > 0 && (
            <Tab
              key="favorites"
              title={
                <span className="flex items-center gap-2">
                  <Icon name="HeartSolid" size="sm" className="text-danger" />
                  {favorites.length}
                </span>
              }
            />
          )}
        </Tabs>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          {onViewModeChange && (
            <div className="flex gap-1 bg-default-100 rounded-lg p-1">
              <Button
                isIconOnly
                size="sm"
                variant={viewMode === 'grid' ? 'flat' : 'light'}
                onPress={() => onViewModeChange('grid')}
              >
                <Icon name="ViewGrid" size="sm" />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant={viewMode === 'masonry' ? 'flat' : 'light'}
                onPress={() => onViewModeChange('masonry')}
              >
                <Icon name="TableRows" size="sm" />
              </Button>
            </div>
          )}

          {/* Clear all */}
          {onClearAll && images.length > 0 && (
            <Button
              size="sm"
              variant="light"
              color="danger"
              startContent={<Icon name="Trash" size="sm" />}
              onPress={onClearAll}
            >
              {t('Clear')}
            </Button>
          )}
        </div>
      </div>

      {/* Current session images */}
      {images.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-default-500 mb-3">
            {t('Current Session')}
          </h3>
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'
                : viewMode === 'masonry'
                  ? 'columns-2 sm:columns-3 md:columns-4 gap-4 space-y-4'
                  : 'flex flex-col gap-4'
            }
          >
            {images.map((image) => (
              <GeneratedImageCard
                key={image.id}
                lang={lang}
                image={image}
                isSelected={selectedImageIds.includes(image.id)}
                onSelect={() => onSelectImage?.(image.id)}
                onDownload={() => onDownloadImage?.(image)}
                onDelete={() => onDeleteImage?.(image.id)}
                onUseAsReference={() => onUseAsReference?.(image)}
              />
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-default-500 mb-3">
            {t('History')}
          </h3>

          {isLoadingHistory ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="space-y-6">
              {history.map((entry) => (
                <HistoryEntry
                  key={entry.id}
                  lang={lang}
                  entry={entry}
                  viewMode={viewMode}
                  onDownloadImage={onDownloadImage}
                  onDeleteImage={onDeleteImage}
                  onUseAsReference={onUseAsReference}
                  onToggleFavorite={() => onToggleFavorite?.(entry.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// History entry component
function HistoryEntry({
  lang,
  entry,
  viewMode,
  onDownloadImage,
  onDeleteImage,
  onUseAsReference,
  onToggleFavorite,
}: {
  lang: Lang
  entry: StudioEntry
  viewMode: 'grid' | 'list' | 'masonry'
  onDownloadImage?: (image: GeneratedImage) => void
  onDeleteImage?: (imageId: string) => void
  onUseAsReference?: (image: GeneratedImage) => void
  onToggleFavorite?: () => void
}) {
  const { t: _t } = useI18n(lang as any)

  return (
    <div className="border border-default-200 rounded-lg p-4">
      {/* Entry header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-2">{entry.prompt}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-default-400">
              {new Date(entry.createdAt).toLocaleDateString()}
            </span>
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex gap-1">
                {entry.tags.slice(0, 3).map((tag) => (
                  <Chip key={tag} size="sm" variant="flat" className="text-xs">
                    {tag}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        </div>

        {onToggleFavorite && (
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={onToggleFavorite}
          >
            <Icon
              name={entry.isFavorite ? 'HeartSolid' : 'Heart'}
              size="sm"
              className={entry.isFavorite ? 'text-danger' : 'text-default-400'}
            />
          </Button>
        )}
      </div>

      {/* Entry images */}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-4 gap-2'
            : 'flex gap-2 overflow-x-auto'
        }
      >
        {entry.images.map((image) => (
          <GeneratedImageCard
            key={image.id}
            lang={lang}
            image={image}
            showActions={false}
            onDownload={() => onDownloadImage?.(image)}
            onDelete={() => onDeleteImage?.(image.id)}
            onUseAsReference={() => onUseAsReference?.(image)}
            onFavorite={onToggleFavorite}
            isFavorite={entry.isFavorite}
          />
        ))}
      </div>
    </div>
  )
}
