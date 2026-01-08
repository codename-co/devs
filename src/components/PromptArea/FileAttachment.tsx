import { useState, useEffect } from 'react'
import { Chip } from '@heroui/react'

import { Icon } from '../Icon'
import { ContentPreviewModal } from '../ContentPreview/ContentPreviewModal'

import { getFileIcon } from '@/lib/utils'

/** Check if a file is an image based on its MIME type */
const isImageFile = (file: File): boolean => file.type.startsWith('image/')

interface FileAttachmentProps {
  file: File
  onRemove: () => void
}

/**
 * Component to display a file attachment chip with preview capability.
 * Shows image thumbnails for image files and appropriate icons for other files.
 * Clicking opens a full preview modal.
 */
export const FileAttachment = ({ file, onRemove }: FileAttachmentProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)

  // Create and cleanup object URL for image thumbnail
  useEffect(() => {
    if (isImageFile(file)) {
      const url = URL.createObjectURL(file)
      setThumbnailUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setThumbnailUrl(null)
    return undefined
  }, [file])

  const handleOpenPreview = () => {
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setIsPreviewOpen(true)
  }

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setIsPreviewOpen(false)
  }

  return (
    <>
      <Chip
        variant="bordered"
        className="cursor-pointer hover:bg-default-200 transition-colors"
        onClick={handleOpenPreview}
        onClose={onRemove}
      >
        <span
          className="text-xs flex flex-row items-center gap-1 max-w-48 overflow-hidden"
          title={file.name}
        >
          {isImageFile(file) && thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={file.name}
              className="w-5 h-5 object-cover rounded"
            />
          ) : (
            <Icon className="w-4" name={getFileIcon(file.type) as any} />
          )}
          <span className="whitespace-nowrap overflow-hidden text-ellipsis">
            {file.name.substring(0, 32)}
          </span>
        </span>
      </Chip>

      {/* File Preview Modal */}
      {previewUrl && (
        <ContentPreviewModal
          isOpen={isPreviewOpen}
          onClose={handleClosePreview}
          type="knowledge"
          item={{
            id: file.name,
            name: file.name,
            type: 'file',
            fileType: file.type.startsWith('image/')
              ? 'image'
              : file.type.startsWith('text/') ||
                  file.name.match(
                    /\.(md|txt|json|js|ts|tsx|jsx|css|html|xml|yaml|yml)$/i,
                  )
                ? 'text'
                : 'document',
            content: previewUrl,
            mimeType: file.type,
            size: file.size,
            path: file.name,
            lastModified: new Date(file.lastModified),
            createdAt: new Date(file.lastModified),
          }}
        />
      )}
    </>
  )
}
