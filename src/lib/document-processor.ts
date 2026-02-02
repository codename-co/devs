import {
  AutoModelForVision2Seq,
  AutoProcessor,
  RawImage,
  TextStreamer,
} from '@huggingface/transformers'
import * as pdfjsLib from 'pdfjs-dist'
import PostalMime from 'postal-mime'
import {
  getKnowledgeItemAsync,
  updateKnowledgeItem,
} from '@/stores/knowledgeStore'
import type { KnowledgeItem } from '@/types'

// Configure PDF.js worker from unpkg CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

/**
 * Document processing service using Granite Docling model
 * Handles async extraction and structuring of document content
 */

export interface ProcessingJob {
  id: string
  knowledgeItemId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
  startedAt?: Date
  completedAt?: Date
  result?: DocumentProcessingResult
}

export interface DocumentProcessingResult {
  extractedText: string
  structuredContent?: {
    title?: string
    sections?: Array<{
      heading: string
      content: string
    }>
    metadata?: Record<string, any>
  }
  confidence?: number
}

type ProcessingEventType =
  | 'job_started'
  | 'job_progress'
  | 'job_completed'
  | 'job_failed'
  | 'model_loading'
  | 'model_ready'

export interface ProcessingEvent {
  type: ProcessingEventType
  jobId?: string
  progress?: number
  error?: string
  result?: DocumentProcessingResult
}

type ProcessingEventCallback = (event: ProcessingEvent) => void

class DocumentProcessorService {
  private model: any = null
  private processor: any = null
  private initPromise: Promise<void> | null = null
  private processingQueue: ProcessingJob[] = []
  private isProcessing = false
  private eventListeners: ProcessingEventCallback[] = []
  private modelId = 'onnx-community/granite-docling-258M-ONNX'
  private loadingProgress: Record<string, any> = {}

  /**
   * Initialize the Granite Docling model
   * Uses lazy loading to avoid blocking app startup
   */
  async initialize(): Promise<void> {
    if (this.model && this.processor) return
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      try {
        console.log('Initializing Granite Docling model...')
        this.emitEvent({ type: 'model_loading', progress: 0 })

        // Load the model with proper configuration
        this.model = await AutoModelForVision2Seq.from_pretrained(
          this.modelId,
          {
            dtype: {
              embed_tokens: 'fp16', // fp16 (116 MB) for better browser performance
              vision_encoder: 'fp32', // fp32 (374 MB)
              decoder_model_merged: 'fp32', // fp32 (658 MB) for stability
            },
            device: 'webgpu',
            progress_callback: (data: any) => {
              if (
                data.status === 'progress' &&
                data.file?.endsWith?.('onnx_data')
              ) {
                this.loadingProgress[data.file] = data

                // Calculate overall progress
                const files = Object.values(this.loadingProgress)
                if (files.length > 0) {
                  let sum = 0
                  let total = 0
                  for (const file of files as any[]) {
                    sum += file.loaded || 0
                    total += file.total || 0
                  }
                  const overallPercent = total > 0 ? (sum / total) * 100 : 0
                  this.emitEvent({
                    type: 'model_loading',
                    progress: overallPercent,
                  })
                  console.log(
                    `Model loading progress: ${Math.round(overallPercent)}%`,
                  )
                }
              }
            },
          },
        )

        // Load the processor
        this.processor = await AutoProcessor.from_pretrained(this.modelId)

        console.log('Granite Docling model initialized successfully')
        this.emitEvent({ type: 'model_ready', progress: 100 })
      } catch (error) {
        console.error('Failed to initialize Granite Docling model:', error)
        this.model = null
        this.processor = null
        this.initPromise = null
        throw error
      }
    })()

    return this.initPromise
  }

  /**
   * Add a document processing job to the queue
   */
  async queueProcessing(knowledgeItemId: string): Promise<string> {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const job: ProcessingJob = {
      id: jobId,
      knowledgeItemId,
      status: 'pending',
      progress: 0,
    }

    // Update knowledge item status to pending
    const item = await getKnowledgeItemAsync(knowledgeItemId)
    if (item) {
      updateKnowledgeItem({
        ...item,
        processingStatus: 'pending',
      })
    }

    this.processingQueue.push(job)
    console.log(`Queued processing job ${jobId} for item ${knowledgeItemId}`)

    // Start processing if not already running
    // Use queueMicrotask to defer processing start and avoid setState during render
    if (!this.isProcessing) {
      queueMicrotask(() => this.processQueue())
    }

    return jobId
  }

  /**
   * Process the queue of pending jobs
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return
    if (this.processingQueue.length === 0) return

    this.isProcessing = true

    while (this.processingQueue.length > 0) {
      const job = this.processingQueue[0]

      try {
        await this.processJob(job)
      } catch (error) {
        console.error(`Failed to process job ${job.id}:`, error)
        job.status = 'failed'
        job.error = error instanceof Error ? error.message : String(error)
        job.completedAt = new Date()

        // Update knowledge item with failed status
        const item = await getKnowledgeItemAsync(job.knowledgeItemId)
        if (item) {
          updateKnowledgeItem({
            ...item,
            processingStatus: 'failed',
            processingError: job.error,
          })
        }

        this.emitEvent({
          type: 'job_failed',
          jobId: job.id,
          error: job.error,
        })
      }

      // Remove completed job from queue
      this.processingQueue.shift()
    }

    this.isProcessing = false
  }

  /**
   * Process a single job
   */
  private async processJob(job: ProcessingJob): Promise<void> {
    job.status = 'processing'
    job.startedAt = new Date()
    job.progress = 10

    this.emitEvent({
      type: 'job_started',
      jobId: job.id,
    })

    // Load knowledge item
    const item = await getKnowledgeItemAsync(job.knowledgeItemId)
    if (!item) {
      throw new Error('Knowledge item not found')
    }

    // Check if this is a PDF - we can process it without the heavy model
    const isPdf =
      item.mimeType === 'application/pdf' || item.name?.endsWith('.pdf')

    // Only initialize the Granite model for non-PDF documents that need it
    if (!isPdf && item.fileType === 'image') {
      await this.initialize()
      if (!this.model || !this.processor) {
        throw new Error('Model not initialized')
      }
    }

    // Update status to processing
    updateKnowledgeItem({
      ...item,
      processingStatus: 'processing',
    })

    job.progress = 30
    this.emitEvent({
      type: 'job_progress',
      jobId: job.id,
      progress: 30,
    })

    // Extract and process content
    const result = await this.processDocument(item, job)

    job.progress = 90
    this.emitEvent({
      type: 'job_progress',
      jobId: job.id,
      progress: 90,
    })

    // Re-fetch item to get latest state before updating
    const currentItem = await getKnowledgeItemAsync(job.knowledgeItemId)
    if (!currentItem) {
      throw new Error('Knowledge item not found after processing')
    }

    // Update knowledge item with processed transcript (keep original content intact)
    const updatedItem: KnowledgeItem = {
      ...currentItem,
      transcript: result.extractedText,
      processingStatus: 'completed',
      processedAt: new Date(),
      description: result.structuredContent?.title || currentItem.description,
    }

    updateKnowledgeItem(updatedItem)

    job.status = 'completed'
    job.progress = 100
    job.completedAt = new Date()
    job.result = result

    this.emitEvent({
      type: 'job_completed',
      jobId: job.id,
      result,
    })
  }

  /**
   * Process a document using the Granite Docling model or direct text extraction
   */
  private async processDocument(
    item: KnowledgeItem,
    job: ProcessingJob,
  ): Promise<DocumentProcessingResult> {
    try {
      // Handle different file types
      if (item.fileType === 'document' || item.fileType === 'text') {
        // For documents/text, use direct text extraction (no model needed)
        return await this.extractTextDirectly(item)
      }

      // For images, we need the Granite model
      if (!this.model || !this.processor) {
        throw new Error('Model/Processor not initialized for image processing')
      }

      let image: RawImage

      if (item.fileType === 'image' && item.content) {
        // For images, create RawImage from base64 data
        image = await this.createImageFromBase64(item.content)
      } else {
        throw new Error(`Unsupported file type: ${item.fileType}`)
      }

      job.progress = 50
      this.emitEvent({
        type: 'job_progress',
        jobId: job.id,
        progress: 50,
      })

      // Create input messages for the model
      const messages = [
        {
          role: 'user',
          content: [
            { type: 'image' },
            {
              type: 'text',
              text: 'Extract and structure all text content from this document. Identify headings, paragraphs, tables, and other structural elements.',
            },
          ],
        },
      ]

      // Apply chat template
      const text = this.processor.apply_chat_template(messages, {
        add_generation_prompt: true,
      })

      // Process the inputs
      const inputs = await this.processor(text, [image], {
        do_image_splitting: true,
      })

      job.progress = 70
      this.emitEvent({
        type: 'job_progress',
        jobId: job.id,
        progress: 70,
      })

      // Generate output with streaming
      let fullText = ''
      const streamer = new TextStreamer(this.processor.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (streamedText: string) => {
          fullText += streamedText
        },
      })

      await this.model.generate({
        ...inputs,
        max_new_tokens: 4096,
        streamer,
      })

      // Parse the structured output
      const structuredContent = this.parseStructuredContent(fullText, item)

      return {
        extractedText: fullText,
        structuredContent,
        confidence: 0.9,
      }
    } catch (error) {
      console.error('Error processing document with model:', error)
      // Fallback to basic text extraction
      return await this.extractTextDirectly(item)
    }
  }

  /**
   * Create RawImage from base64 data
   */
  private async createImageFromBase64(base64Data: string): Promise<RawImage> {
    // Remove data URL prefix if present
    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '')

    // Convert base64 to blob
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const blob = new Blob([bytes])

    // Create image element
    const img = new Image()
    const url = URL.createObjectURL(blob)

    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = url
    })

    // Create canvas and draw image
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')

    ctx.drawImage(img, 0, 0)

    // Clean up
    URL.revokeObjectURL(url)

    // Create RawImage from canvas
    return RawImage.fromCanvas(canvas)
  }

  /**
   * Fallback text extraction for non-image documents
   */
  private async extractTextDirectly(
    item: KnowledgeItem,
  ): Promise<DocumentProcessingResult> {
    const content = item.content || ''

    // Handle PDF files
    if (item.mimeType === 'application/pdf' || item.name?.endsWith('.pdf')) {
      return this.extractTextFromPdf(content, item)
    }

    // Handle email files (RFC 822)
    if (item.mimeType === 'message/rfc822' || item.name?.endsWith('.eml')) {
      return this.extractTextFromEmail(content, item)
    }

    // Basic structure detection for plain text
    const lines = content.split('\n')
    const sections: Array<{ heading: string; content: string }> = []
    let currentSection: { heading: string; content: string } | null = null

    for (const line of lines) {
      const trimmed = line.trim()

      // Detect headings (lines that are short and followed by content)
      if (
        trimmed.length > 0 &&
        trimmed.length < 100 &&
        /^[A-Z]/.test(trimmed) &&
        !trimmed.endsWith('.')
      ) {
        if (currentSection) {
          sections.push(currentSection)
        }
        currentSection = { heading: trimmed, content: '' }
      } else if (currentSection && trimmed.length > 0) {
        currentSection.content += line + '\n'
      }
    }

    if (currentSection) {
      sections.push(currentSection)
    }

    return {
      extractedText: content,
      structuredContent: {
        title: item.name,
        sections: sections.length > 0 ? sections : undefined,
        metadata: {
          fileType: item.fileType,
          mimeType: item.mimeType,
          size: item.size,
        },
      },
      confidence: 0.7,
    }
  }

  /**
   * Extract text content from a PDF file
   */
  private async extractTextFromPdf(
    base64Content: string,
    item: KnowledgeItem,
  ): Promise<DocumentProcessingResult> {
    try {
      // Remove data URL prefix if present
      const base64Data = base64Content.replace(
        /^data:application\/pdf;base64,/,
        '',
      )

      // Convert base64 to Uint8Array
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ data: bytes })
      const pdf = await loadingTask.promise

      // Extract text from all pages
      const textParts: string[] = []
      const numPages = pdf.numPages

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()

        // Combine text items, preserving some structure
        let pageText = ''
        let lastY: number | null = null

        for (const textItem of textContent.items) {
          if ('str' in textItem) {
            const item = textItem as { str: string; transform: number[] }
            const currentY = item.transform[5]

            // Add newline when Y position changes significantly (new line)
            if (lastY !== null && Math.abs(currentY - lastY) > 5) {
              pageText += '\n'
            } else if (pageText.length > 0 && !pageText.endsWith(' ')) {
              pageText += ' '
            }

            pageText += item.str
            lastY = currentY
          }
        }

        if (pageText.trim()) {
          textParts.push(pageText.trim())
        }
      }

      const extractedText = textParts.join('\n\n')

      // Parse structure from extracted text
      const structuredContent = this.parseTextStructure(extractedText, item)

      return {
        extractedText,
        structuredContent,
        confidence: 0.85,
      }
    } catch (error) {
      console.error('Failed to extract text from PDF:', error)
      // Return error info instead of raw base64
      return {
        extractedText: `[PDF text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}]`,
        structuredContent: {
          title: item.name,
          metadata: {
            fileType: item.fileType,
            mimeType: item.mimeType,
            size: item.size,
            extractionError: true,
          },
        },
        confidence: 0,
      }
    }
  }

  /**
   * Extract text content from an email file (RFC 822 / .eml)
   * Uses postal-mime to parse the email and extract plain text body
   */
  private async extractTextFromEmail(
    content: string,
    item: KnowledgeItem,
  ): Promise<DocumentProcessingResult> {
    try {
      const email = await PostalMime.parse(content)

      // Build the extracted text with headers and body
      let extractedText = ''

      // Add key headers as context
      if (email.subject) {
        extractedText += `Subject: ${email.subject}\n`
      }
      if (email.from?.address) {
        const fromName = email.from.name
          ? `${email.from.name} <${email.from.address}>`
          : email.from.address
        extractedText += `From: ${fromName}\n`
      }
      if (email.to && email.to.length > 0) {
        const toAddresses = email.to
          .map((t) => (t.name ? `${t.name} <${t.address}>` : t.address))
          .join(', ')
        extractedText += `To: ${toAddresses}\n`
      }
      if (email.date) {
        extractedText += `Date: ${email.date}\n`
      }

      extractedText += '\n---\n\n'

      // Get the body content - prefer plain text, fall back to HTML
      let bodyText = ''
      if (email.text) {
        bodyText = this.cleanEmailText(email.text)
      } else if (email.html) {
        bodyText = this.cleanEmailText(this.stripHtmlTags(email.html))
      }

      extractedText += bodyText

      return {
        extractedText: extractedText.trim(),
        structuredContent: {
          title: email.subject || item.name,
          metadata: {
            fileType: item.fileType,
            mimeType: item.mimeType,
            size: item.size,
            processingMethod: 'postal-mime',
            emailFrom: email.from?.address,
            emailDate: email.date,
          },
        },
        confidence: 0.9,
      }
    } catch (error) {
      console.error('Failed to extract text from email:', error)
      return {
        extractedText: `[Email text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}]`,
        structuredContent: {
          title: item.name,
          metadata: {
            fileType: item.fileType,
            mimeType: item.mimeType,
            size: item.size,
            extractionError: true,
          },
        },
        confidence: 0,
      }
    }
  }

  /**
   * Strip HTML tags and decode HTML entities to get plain text
   */
  private stripHtmlTags(html: string): string {
    return (
      html
        // Remove style and script blocks entirely
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        // Replace block-level elements with newlines
        .replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<hr\s*\/?>/gi, '\n---\n')
        // Remove all remaining HTML tags
        .replace(/<[^>]+>/g, '')
        // Decode common HTML entities
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&apos;/gi, "'")
        // Decode numeric HTML entities
        .replace(/&#(\d+);/g, (_, code) =>
          String.fromCharCode(parseInt(code, 10)),
        )
        .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
          String.fromCharCode(parseInt(code, 16)),
        )
    )
  }

  /**
   * Clean up extracted email text
   */
  private cleanEmailText(text: string): string {
    return (
      text
        // Normalize line endings
        .replace(/\r\n/g, '\n')
        // Remove excessive blank lines (more than 2 consecutive)
        .replace(/\n{3,}/g, '\n\n')
        // Remove trailing whitespace on each line
        .replace(/[ \t]+$/gm, '')
        // Remove leading whitespace on each line (but preserve indentation for quotes)
        .replace(/^[ \t]+(?=[^\s>])/gm, '')
        // Trim overall
        .trim()
    )
  }

  /**
   * Parse structure from plain text (headings, sections)
   */
  private parseTextStructure(
    text: string,
    item: KnowledgeItem,
  ): DocumentProcessingResult['structuredContent'] {
    const lines = text.split('\n')
    const sections: Array<{ heading: string; content: string }> = []
    let currentSection: { heading: string; content: string } | null = null
    let title: string | undefined

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      // Detect potential headings (short lines, start with capital, no ending punctuation)
      const isHeading =
        trimmed.length > 0 &&
        trimmed.length < 80 &&
        /^[A-Z0-9]/.test(trimmed) &&
        !/[.,:;]$/.test(trimmed) &&
        trimmed === trimmed.toUpperCase()

      if (isHeading) {
        if (!title) {
          title = trimmed
        }
        if (currentSection) {
          sections.push(currentSection)
        }
        currentSection = { heading: trimmed, content: '' }
      } else if (currentSection) {
        currentSection.content += line + '\n'
      } else {
        // Content before first heading
        if (!currentSection) {
          currentSection = { heading: '', content: line + '\n' }
        }
      }
    }

    if (currentSection) {
      sections.push(currentSection)
    }

    return {
      title: title || item.name,
      sections: sections.length > 0 ? sections : undefined,
      metadata: {
        fileType: item.fileType,
        mimeType: item.mimeType,
        size: item.size,
        processingMethod: 'pdfjs',
      },
    }
  }

  /**
   * Parse structured content from model output
   */
  private parseStructuredContent(
    text: string,
    item: KnowledgeItem,
  ): DocumentProcessingResult['structuredContent'] {
    // Extract title (usually first line or heading)
    const lines = text.split('\n').filter((l) => l.trim())
    const title = lines[0] || item.name

    // Simple section detection based on markdown-like headers
    const sections: Array<{ heading: string; content: string }> = []
    let currentSection: { heading: string; content: string } | null = null

    for (const line of lines) {
      const trimmed = line.trim()

      // Detect markdown headers (# or ##)
      if (trimmed.match(/^#{1,6}\s+/)) {
        if (currentSection) {
          sections.push(currentSection)
        }
        const heading = trimmed.replace(/^#{1,6}\s+/, '')
        currentSection = { heading, content: '' }
      } else if (currentSection) {
        currentSection.content += line + '\n'
      }
    }

    if (currentSection) {
      sections.push(currentSection)
    }

    return {
      title,
      sections: sections.length > 0 ? sections : undefined,
      metadata: {
        fileType: item.fileType,
        mimeType: item.mimeType,
        size: item.size,
        processingMethod: 'granite-docling',
      },
    }
  }

  /**
   * Subscribe to processing events
   */
  onProcessingEvent(callback: ProcessingEventCallback): () => void {
    this.eventListeners.push(callback)
    return () => {
      const index = this.eventListeners.indexOf(callback)
      if (index > -1) {
        this.eventListeners.splice(index, 1)
      }
    }
  }

  /**
   * Emit an event to all listeners
   */
  private emitEvent(event: ProcessingEvent): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in processing event listener:', error)
      }
    })
  }

  /**
   * Get the status of a processing job
   */
  getJobStatus(jobId: string): ProcessingJob | undefined {
    return this.processingQueue.find((job) => job.id === jobId)
  }

  /**
   * Get all pending jobs
   */
  getPendingJobs(): ProcessingJob[] {
    return this.processingQueue.filter((job) => job.status === 'pending')
  }

  /**
   * Check if the processor is currently busy
   */
  isActive(): boolean {
    return this.isProcessing || this.processingQueue.length > 0
  }

  /**
   * Get model loading progress
   */
  getModelLoadingProgress(): number {
    const files = Object.values(this.loadingProgress)
    if (files.length === 0) return 0

    let sum = 0
    let total = 0
    for (const file of files as any[]) {
      sum += file.loaded || 0
      total += file.total || 0
    }

    return total > 0 ? Math.round((sum / total) * 100) : 0
  }

  /**
   * Check if model is ready
   */
  isModelReady(): boolean {
    return this.model !== null && this.processor !== null
  }
}

// Export singleton instance
export const documentProcessor = new DocumentProcessorService()
