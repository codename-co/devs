import { describe, it, expect } from 'vitest'
import {
  isConvertibleWordDocument,
  isOfficeDocument,
  getFormatName,
  OFFICE_DOCUMENT_TYPES,
} from '@/lib/document-converter'

describe('Document Converter', () => {
  describe('isConvertibleWordDocument', () => {
    it('should return true for DOCX files', () => {
      expect(isConvertibleWordDocument(OFFICE_DOCUMENT_TYPES.DOCX)).toBe(true)
    })

    it('should return true for DOC files', () => {
      expect(isConvertibleWordDocument(OFFICE_DOCUMENT_TYPES.DOC)).toBe(true)
    })

    it('should return false for Excel files', () => {
      expect(isConvertibleWordDocument(OFFICE_DOCUMENT_TYPES.XLSX)).toBe(false)
    })

    it('should return false for PDF files', () => {
      expect(isConvertibleWordDocument('application/pdf')).toBe(false)
    })

    it('should return false for unknown MIME types', () => {
      expect(isConvertibleWordDocument('application/octet-stream')).toBe(false)
    })
  })

  describe('isOfficeDocument', () => {
    it('should return true for all Office document types', () => {
      expect(isOfficeDocument(OFFICE_DOCUMENT_TYPES.DOCX)).toBe(true)
      expect(isOfficeDocument(OFFICE_DOCUMENT_TYPES.DOC)).toBe(true)
      expect(isOfficeDocument(OFFICE_DOCUMENT_TYPES.XLSX)).toBe(true)
      expect(isOfficeDocument(OFFICE_DOCUMENT_TYPES.XLS)).toBe(true)
      expect(isOfficeDocument(OFFICE_DOCUMENT_TYPES.PPTX)).toBe(true)
      expect(isOfficeDocument(OFFICE_DOCUMENT_TYPES.PPT)).toBe(true)
    })

    it('should return false for non-Office documents', () => {
      expect(isOfficeDocument('application/pdf')).toBe(false)
      expect(isOfficeDocument('text/plain')).toBe(false)
      expect(isOfficeDocument('image/png')).toBe(false)
    })
  })

  describe('getFormatName', () => {
    it('should return friendly names for Office documents', () => {
      expect(getFormatName(OFFICE_DOCUMENT_TYPES.DOCX)).toBe(
        'Word Document (.docx)',
      )
      expect(getFormatName(OFFICE_DOCUMENT_TYPES.XLSX)).toBe(
        'Excel Spreadsheet (.xlsx)',
      )
      expect(getFormatName(OFFICE_DOCUMENT_TYPES.PPTX)).toBe(
        'PowerPoint Presentation (.pptx)',
      )
    })

    it('should return MIME type for unknown formats', () => {
      expect(getFormatName('application/octet-stream')).toBe(
        'application/octet-stream',
      )
    })
  })
})
