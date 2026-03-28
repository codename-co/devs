import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Alert } from '@/components/heroui-compat'
import { marked } from 'marked'
import PptxGenJS from 'pptxgenjs'
import { useI18n } from '@/i18n'
import { getPptxTheme, PPTX_THEME_AUTO } from '@/lib/pptx-themes'
import { userSettings } from '@/stores/userStore'
import localI18n from './i18n'

/* ------------------------------------------------------------------ */
/*  Types for the internal pptxgenjs slide structure                   */
/* ------------------------------------------------------------------ */

interface SlideTextRun {
  text: string
  options?: {
    bullet?: boolean
    breakLine?: boolean
    color?: string
    fontSize?: number
    bold?: boolean
    italic?: boolean
    align?: 'left' | 'center' | 'right'
  }
}

interface SlideObject {
  _type: string
  shape?: string
  text?: SlideTextRun[] | null
  options?: {
    x?: number
    y?: number
    w?: number | string
    h?: number | string
    fontSize?: number
    color?: string
    bold?: boolean
    italic?: boolean
    align?: 'left' | 'center' | 'right'
    fill?: { color?: string }
    bullet?: boolean
  }
}

interface ParsedSlide {
  background?: string
  objects: SlideObject[]
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

// Default 16:9 slide dimensions in inches
const SLIDE_W_INCHES = 10
const SLIDE_H_INCHES = 5.625
const REFERENCE_WIDTH = 560

/* ------------------------------------------------------------------ */
/*  Safe PptxGenJS subclass for preview (no downloads)                 */
/* ------------------------------------------------------------------ */

class PreviewPptxGenJS extends PptxGenJS {
  override write(): Promise<string> {
    return Promise.resolve('')
  }
  override writeFile(): Promise<string> {
    return Promise.resolve('')
  }
}

/* ------------------------------------------------------------------ */
/*  Execute pptxgenjs code and return the presentation object          */
/* ------------------------------------------------------------------ */

const buildPresentation = (code: string) => {
  const wrappedCode = `
    ${code}
    return pres;
  `
  const fn = new Function('pptxgen', wrappedCode)
  return fn(PreviewPptxGenJS)
}

/* ------------------------------------------------------------------ */
/*  Extract visual slide data from a built presentation                */
/* ------------------------------------------------------------------ */

const extractSlides = (
  pres: ReturnType<typeof buildPresentation>,
): ParsedSlide[] => {
  return ((pres?.slides ?? []) as Array<Record<string, unknown>>).map(
    (slide) => {
      const bg = (slide.background as { color?: string } | undefined)?.color
      const objects: SlideObject[] = (
        (slide._slideObjects ?? []) as Array<Record<string, unknown>>
      ).map((obj) => ({
        _type: obj._type as string,
        shape: obj.shape as string | undefined,
        text: obj.text as SlideTextRun[] | null | undefined,
        options: obj.options as SlideObject['options'],
      }))
      return { background: bg, objects }
    },
  )
}

/* ------------------------------------------------------------------ */
/*  Resolve a dimension value (number in inches, or percentage string) */
/* ------------------------------------------------------------------ */

const resolveDimension = (
  value: number | string | undefined,
  referenceInches: number,
): number | undefined => {
  if (value === undefined) return undefined
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.endsWith('%')) {
    const pct = parseFloat(value) / 100
    return pct * referenceInches
  }
  return parseFloat(value) || undefined
}

/* ------------------------------------------------------------------ */
/*  Auto-shrink content to fit via CSS scale transform                  */
/* ------------------------------------------------------------------ */

const AutoFitText = ({
  style,
  children,
}: {
  style: React.CSSProperties
  children: React.ReactNode
}) => {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    // Reset to measure natural size
    inner.style.transform = ''
    inner.style.width = '100%'

    const available = outer.clientHeight
    const natural = inner.scrollHeight

    if (natural > available && available > 0) {
      const s = Math.max(available / natural, 0.3)
      inner.style.transform = `scale(${s})`
      inner.style.width = `${100 / s}%`
    }
  })

  return (
    <div ref={outerRef} style={style}>
      <div
        ref={innerRef}
        style={{
          transformOrigin: 'top left',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: '100%',
        }}
      >
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Render a single slide element                                      */
/* ------------------------------------------------------------------ */

const SlideElement = ({ obj, scale }: { obj: SlideObject; scale: number }) => {
  const opts = obj.options ?? {}
  const x = (opts.x ?? 0) * scale
  const y = (opts.y ?? 0) * scale
  const w = resolveDimension(opts.w, SLIDE_W_INCHES)
  const h = resolveDimension(opts.h, SLIDE_H_INCHES)
  const widthPx = w !== undefined ? w * scale : undefined
  const heightPx = h !== undefined ? h * scale : undefined
  const fontSize =
    (((opts.fontSize ?? 14) * scale) / REFERENCE_WIDTH) * SLIDE_W_INCHES
  const color = opts.color ? `#${opts.color}` : undefined

  // Shape-only (no text)
  if (obj._type === 'text' && !obj.text && opts.fill?.color) {
    return (
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: widthPx,
          height: heightPx,
          backgroundColor: `#${opts.fill.color}`,
          borderRadius: 2,
        }}
      />
    )
  }

  // Text element
  if (obj._type === 'text' && obj.text) {
    const textAlign = opts.align ?? 'left'
    return (
      <AutoFitText
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: widthPx,
          height: heightPx,
          overflow: 'hidden',
          textAlign,
        }}
      >
        {obj.text.map((run, i) => {
          const runColor = run.options?.color ? `#${run.options.color}` : color
          const runFontSize = run.options?.fontSize
            ? ((run.options.fontSize * scale) / REFERENCE_WIDTH) *
              SLIDE_W_INCHES
            : fontSize
          const isBold = run.options?.bold ?? opts.bold
          const isItalic = run.options?.italic ?? opts.italic
          const isBullet = run.options?.bullet ?? opts.bullet

          const rawText = isBullet ? `• ${run.text}` : run.text
          const html = marked.parseInline(rawText) as string

          return (
            <span
              key={i}
              style={{
                display: 'block',
                color: runColor,
                fontSize: runFontSize,
                fontWeight: isBold ? 700 : 400,
                fontStyle: isItalic ? 'italic' : 'normal',
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
                textAlign:
                  (run.options?.align as React.CSSProperties['textAlign']) ??
                  textAlign,
              }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )
        })}
      </AutoFitText>
    )
  }

  return null
}

/* ------------------------------------------------------------------ */
/*  Render a single slide preview                                      */
/* ------------------------------------------------------------------ */

const SlidePreview = ({
  slide,
  index,
  fontFamily,
}: {
  slide: ParsedSlide
  index: number
  fontFamily: string
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const refScale = REFERENCE_WIDTH / SLIDE_W_INCHES
  const refHeight = SLIDE_H_INCHES * refScale
  const cssScale = containerWidth > 0 ? containerWidth / REFERENCE_WIDTH : 1
  const bg = slide.background ? `#${slide.background}` : '#FFFFFF'

  return (
    <div className="flex flex-col gap-1 w-full">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg border border-default-200 shadow-sm w-full"
        style={{
          aspectRatio: `${SLIDE_W_INCHES} / ${SLIDE_H_INCHES}`,
          backgroundColor: bg,
          fontFamily,
        }}
      >
        {containerWidth > 0 && (
          <div
            style={{
              width: REFERENCE_WIDTH,
              height: refHeight,
              transform: `scale(${cssScale})`,
              transformOrigin: 'top left',
            }}
          >
            {slide.objects.map((obj, i) => (
              <SlideElement key={i} obj={obj} scale={refScale} />
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-default-400 text-center">{index + 1}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main PPTX Widget                                                   */
/* ------------------------------------------------------------------ */

export const PPTX = ({ code }: { code: string }) => {
  const [error, setError] = useState<string | null>(null)
  const [slides, setSlides] = useState<ParsedSlide[]>([])
  const { t } = useI18n(localI18n)

  const pptxThemeId = userSettings((s) => s.pptxTheme) ?? PPTX_THEME_AUTO
  const colorThemeId = userSettings((s) => s.colorTheme)
  const pptxTheme = getPptxTheme(pptxThemeId, colorThemeId)
  const fontFamily = `'${pptxTheme.bodyFont}', '${pptxTheme.headingFont}', Arial, sans-serif`

  // Build presentation and extract slides for preview
  useEffect(() => {
    try {
      const pres = buildPresentation(code)
      if (pres && pres.slides) {
        setSlides(extractSlides(pres))
      }
      setError(null)
    } catch (err) {
      console.error('PPTX preview error:', err)
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [code])

  return (
    <div className="pptx-widget flex flex-col gap-4">
      {/* Slide previews */}
      {slides.length > 0 && (
        <div className="flex flex-col gap-4">
          {slides.map((slide, i) => (
            <SlidePreview
              key={i}
              slide={slide}
              index={i}
              fontFamily={fontFamily}
            />
          ))}
        </div>
      )}

      {error && (
        <Alert
          color="danger"
          title={t('Generation error')}
          description={error}
        />
      )}
    </div>
  )
}
