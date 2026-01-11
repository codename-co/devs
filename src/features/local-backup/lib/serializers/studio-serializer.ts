/**
 * Studio Serializer
 *
 * Serialize/deserialize StudioEntry entities to Markdown with YAML frontmatter.
 * Studio entries contain image generation history with associated settings and images.
 *
 * Format:
 * ```
 * ---
 * id: studio-1704067200000-abc123
 * prompt: "A serene mountain landscape at sunset"
 * isFavorite: true
 * tags:
 *   - landscape
 *   - nature
 * createdAt: "2024-01-01T00:00:00.000Z"
 * settings:
 *   aspectRatio: "16:9"
 *   quality: hd
 *   style: natural
 * images:
 *   - id: img-1
 *     width: 1792
 *     height: 1024
 *     format: png
 *     revisedPrompt: "A serene mountain landscape..."
 * ---
 *
 * ## Prompt
 *
 * A serene mountain landscape at sunset
 *
 * ## Images
 *
 * ![Image 1](./studio-1704067200000-abc123-1.png)
 * ```
 */
import type {
  StudioEntry,
  GeneratedImage,
  ImageGenerationSettings,
} from '@/features/studio/types'
import type {
  FileMetadata,
  StudioEntryFrontmatter,
  SerializedFile,
  Serializer,
  SerializedStudioFileSet,
} from './types'
import {
  parseFrontmatter,
  stringifyFrontmatter,
  sanitizeFilename,
  formatDate,
  parseDate,
  shortHash,
} from '../utils'

const DIRECTORY = 'studio'
const EXTENSION = '.studio.md'

/**
 * Convert ImageGenerationSettings to serializable frontmatter format
 */
function settingsToFrontmatter(
  settings: ImageGenerationSettings,
): Record<string, unknown> {
  return {
    aspectRatio: settings.aspectRatio,
    quality: settings.quality,
    style: settings.style,
    lighting: settings.lighting,
    colorPalette: settings.colorPalette,
    composition: settings.composition,
    count: settings.count,
    ...(settings.negativePrompt && { negativePrompt: settings.negativePrompt }),
    ...(settings.seed !== undefined && { seed: settings.seed }),
    ...(settings.guidanceScale !== undefined && {
      guidanceScale: settings.guidanceScale,
    }),
    ...(settings.width !== undefined && { width: settings.width }),
    ...(settings.height !== undefined && { height: settings.height }),
  }
}

/**
 * Convert frontmatter to ImageGenerationSettings
 */
function frontmatterToSettings(
  fm: Record<string, unknown>,
): ImageGenerationSettings {
  return {
    aspectRatio:
      (fm.aspectRatio as ImageGenerationSettings['aspectRatio']) || '1:1',
    quality: (fm.quality as ImageGenerationSettings['quality']) || 'standard',
    style: (fm.style as ImageGenerationSettings['style']) || 'natural',
    lighting: (fm.lighting as ImageGenerationSettings['lighting']) || 'none',
    colorPalette:
      (fm.colorPalette as ImageGenerationSettings['colorPalette']) || 'none',
    composition:
      (fm.composition as ImageGenerationSettings['composition']) || 'none',
    count: (fm.count as number) || 1,
    negativePrompt: fm.negativePrompt as string | undefined,
    seed: fm.seed as number | undefined,
    guidanceScale: fm.guidanceScale as number | undefined,
    width: fm.width as number | undefined,
    height: fm.height as number | undefined,
  }
}

/**
 * Convert GeneratedImage to serializable frontmatter format (without base64 data)
 */
function imageToFrontmatter(image: GeneratedImage): Record<string, unknown> {
  return {
    id: image.id,
    width: image.width,
    height: image.height,
    format: image.format,
    ...(image.size && { size: image.size }),
    ...(image.revisedPrompt && { revisedPrompt: image.revisedPrompt }),
    ...(image.seed !== undefined && { seed: image.seed }),
    createdAt: formatDate(image.createdAt),
  }
}

/**
 * Convert frontmatter to GeneratedImage
 */
function frontmatterToImage(
  fm: Record<string, unknown>,
  requestId: string,
): GeneratedImage {
  return {
    id: fm.id as string,
    requestId,
    url: '', // Will be reconstructed from file
    width: fm.width as number,
    height: fm.height as number,
    format: fm.format as 'png' | 'jpg' | 'webp',
    size: fm.size as number | undefined,
    revisedPrompt: fm.revisedPrompt as string | undefined,
    seed: fm.seed as number | undefined,
    createdAt: parseDate(fm.createdAt as string) || new Date(),
  }
}

/**
 * Serialize a StudioEntry to Markdown with YAML frontmatter
 */
function serialize(entry: StudioEntry): SerializedFile {
  const frontmatter: StudioEntryFrontmatter = {
    id: entry.id,
    prompt: entry.prompt,
    ...(entry.isFavorite && { isFavorite: entry.isFavorite }),
    ...(entry.tags?.length && { tags: entry.tags }),
    createdAt: formatDate(entry.createdAt),
    settings: settingsToFrontmatter(entry.settings),
    images: entry.images.map(imageToFrontmatter),
  }

  // Build body content
  let body = '## Prompt\n\n' + entry.prompt

  // Add images section with references to binary files
  if (entry.images.length > 0) {
    body += '\n\n## Images\n'
    entry.images.forEach((image, index) => {
      const imageFilename = `${sanitizeFilename(entry.id)}-${index + 1}.${image.format}`
      body += `\n![Image ${index + 1}](./${imageFilename})`
      if (image.revisedPrompt) {
        body += `\n_Revised: ${image.revisedPrompt}_`
      }
      body += '\n'
    })
  }

  const content = stringifyFrontmatter(frontmatter, body)

  return {
    filename: getFilename(entry),
    content,
    directory: DIRECTORY,
  }
}

/**
 * Serialize a StudioEntry to multiple files (metadata + images)
 */
function serializeStudioFileSet(entry: StudioEntry): SerializedStudioFileSet {
  const serialized = serialize(entry)

  // Prepare image files
  const imageFiles: { filename: string; content: string; isBase64: boolean }[] =
    []

  entry.images.forEach((image, index) => {
    // Get image data from base64 or URL
    const imageData = image.base64 || image.url
    if (imageData) {
      const filename = `${sanitizeFilename(entry.id)}-${index + 1}.${image.format}`
      // Check if it's a base64 data URL or raw base64
      const isBase64 =
        imageData.startsWith('data:') || !imageData.startsWith('http')
      imageFiles.push({
        filename,
        content: imageData,
        isBase64,
      })
    }
  })

  return {
    metadataFilename: serialized.filename,
    metadataContent: serialized.content,
    directory: serialized.directory,
    imageFiles,
  }
}

/**
 * Deserialize Markdown with YAML frontmatter to a StudioEntry
 * If file metadata is provided and frontmatter lacks timestamps, use file metadata
 *
 * Note: For studio entries, binaryContent parameter is not used directly.
 * Instead, use the deserializeWithImages method for full image reconstruction.
 */
function deserialize(
  content: string,
  filename: string,
  fileMetadata?: FileMetadata,
  _binaryContent?: string, // Not used for studio - images handled separately
): StudioEntry | null {
  const parsed = parseFrontmatter<StudioEntryFrontmatter>(content)
  if (!parsed) {
    console.warn(`Failed to parse studio file: ${filename}`)
    return null
  }

  const { frontmatter } = parsed

  // Parse images without binary content (for basic deserialization)
  const images: GeneratedImage[] = (frontmatter.images || []).map(
    (imgFm: Record<string, unknown>) => {
      return frontmatterToImage(imgFm, frontmatter.id)
    },
  )

  // Determine timestamps
  let createdAt = parseDate(frontmatter.createdAt)
  if (!createdAt && fileMetadata) {
    createdAt = fileMetadata.lastModified
  }
  if (!createdAt) {
    createdAt = new Date()
  }

  const entry: StudioEntry = {
    id: frontmatter.id,
    prompt: frontmatter.prompt,
    settings: frontmatterToSettings(
      frontmatter.settings as Record<string, unknown>,
    ),
    images,
    isFavorite: frontmatter.isFavorite,
    tags: frontmatter.tags,
    createdAt,
  }

  return entry
}

/**
 * Deserialize with image contents from a Map of filename -> base64 content
 */
function deserializeWithImages(
  content: string,
  filename: string,
  fileMetadata?: FileMetadata,
  imageContents?: Map<string, string>,
): StudioEntry | null {
  const entry = deserialize(content, filename, fileMetadata)
  if (!entry || !imageContents) return entry

  // Reconstruct images with their binary content
  entry.images = entry.images.map((image, index) => {
    const imageFilename = `${sanitizeFilename(entry.id)}-${index + 1}.${image.format}`
    const imageContent = imageContents.get(imageFilename)

    if (imageContent) {
      image.base64 = imageContent
      // Create a data URL for display
      image.url = imageContent.startsWith('data:')
        ? imageContent
        : `data:image/${image.format};base64,${imageContent}`
    }

    return image
  })

  return entry
}

/**
 * Get the filename for a studio entry
 */
function getFilename(entry: StudioEntry): string {
  const hash = shortHash(entry.id)
  const promptSlug = sanitizeFilename(entry.prompt.slice(0, 30))
  return `${promptSlug}-${hash}${EXTENSION}`
}

/**
 * Get the extension for studio files
 */
function getExtension(): string {
  return EXTENSION
}

/**
 * Get the directory name for studio entries
 */
function getDirectory(): string {
  return DIRECTORY
}

export const studioSerializer: Serializer<StudioEntry> & {
  serializeStudioFileSet: (entry: StudioEntry) => SerializedStudioFileSet
  deserializeWithImages: (
    content: string,
    filename: string,
    fileMetadata?: FileMetadata,
    imageContents?: Map<string, string>,
  ) => StudioEntry | null
} = {
  serialize,
  deserialize,
  getExtension,
  getDirectory,
  getFilename,
  serializeStudioFileSet,
  deserializeWithImages,
}
