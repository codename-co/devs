import { describe, it, expect } from 'vitest'

// We need to test the MIME decoding functionality
// Since decodeMimeEncodedWord is not exported, we test it through normalizeItem

// Import the provider to test normalizeItem behavior
import gmailProvider from '@/features/connectors/providers/apps/gmail'

describe('GmailProvider', () => {
  describe('normalizeItem - MIME encoded-word decoding (RFC 2047)', () => {
    // Helper to create a minimal raw Gmail message
    const createRawMessage = (subject: string, from = 'test@example.com') => {
      const rawContent = `Subject: ${subject}\r\nFrom: ${from}\r\nDate: Mon, 10 Jan 2026 12:00:00 +0000\r\n\r\nBody content`
      // Encode to URL-safe Base64 (Gmail format)
      const base64 = btoa(rawContent)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
      return base64
    }

    it('should decode Quoted-Printable encoded subject (UTF-8)', () => {
      // "Your account is live – next, add your business info"
      // The en-dash (–) is =E2=80=93 in UTF-8, comma is =2C
      const encodedSubject =
        '=?UTF-8?Q?Your_account_is_live_=E2=80=93_next=2C_add_your_business_inf?= =?UTF-8?Q?o?='

      const message = {
        id: 'msg123',
        threadId: 'thread123',
        raw: createRawMessage(encodedSubject),
        internalDate: '1736510400000',
        labelIds: ['INBOX'],
      }

      const result = gmailProvider.normalizeItem(message)

      expect(result.name).toBe(
        'Your account is live – next, add your business info',
      )
    })

    it('should decode Base64 encoded subject (UTF-8)', () => {
      // "Hello World" in Base64
      const encodedSubject = '=?UTF-8?B?SGVsbG8gV29ybGQ=?='

      const message = {
        id: 'msg124',
        threadId: 'thread124',
        raw: createRawMessage(encodedSubject),
        internalDate: '1736510400000',
        labelIds: ['INBOX'],
      }

      const result = gmailProvider.normalizeItem(message)

      expect(result.name).toBe('Hello World')
    })

    it('should decode subject with special characters', () => {
      // "Café résumé" with accented characters
      const encodedSubject = '=?UTF-8?Q?Caf=C3=A9_r=C3=A9sum=C3=A9?='

      const message = {
        id: 'msg125',
        threadId: 'thread125',
        raw: createRawMessage(encodedSubject),
        internalDate: '1736510400000',
        labelIds: ['INBOX'],
      }

      const result = gmailProvider.normalizeItem(message)

      expect(result.name).toBe('Café résumé')
    })

    it('should handle plain ASCII subject without encoding', () => {
      const plainSubject = 'Hello World - Plain Subject'

      const message = {
        id: 'msg126',
        threadId: 'thread126',
        raw: createRawMessage(plainSubject),
        internalDate: '1736510400000',
        labelIds: ['INBOX'],
      }

      const result = gmailProvider.normalizeItem(message)

      expect(result.name).toBe('Hello World - Plain Subject')
    })

    it('should handle mixed encoded and plain text', () => {
      // "Re: Café meeting" where only "Café" is encoded
      const mixedSubject = 'Re: =?UTF-8?Q?Caf=C3=A9?= meeting'

      const message = {
        id: 'msg127',
        threadId: 'thread127',
        raw: createRawMessage(mixedSubject),
        internalDate: '1736510400000',
        labelIds: ['INBOX'],
      }

      const result = gmailProvider.normalizeItem(message)

      expect(result.name).toBe('Re: Café meeting')
    })

    it('should decode From header with encoded name', () => {
      // "José García" <jose@example.com>
      const encodedFrom = '=?UTF-8?Q?Jos=C3=A9_Garc=C3=ADa?= <jose@example.com>'

      const rawContent = `Subject: Test\r\nFrom: ${encodedFrom}\r\nDate: Mon, 10 Jan 2026 12:00:00 +0000\r\n\r\nBody`
      const base64 = btoa(rawContent)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

      const message = {
        id: 'msg128',
        threadId: 'thread128',
        raw: base64,
        internalDate: '1736510400000',
        labelIds: ['INBOX'],
      }

      const result = gmailProvider.normalizeItem(message)

      expect(result.description).toBe('From: José García <jose@example.com>')
    })

    it('should handle ISO-8859-1 encoded subject', () => {
      // "Héllo" in ISO-8859-1 Q encoding (é = E9 in ISO-8859-1)
      const encodedSubject = '=?ISO-8859-1?Q?H=E9llo?='

      const message = {
        id: 'msg129',
        threadId: 'thread129',
        raw: createRawMessage(encodedSubject),
        internalDate: '1736510400000',
        labelIds: ['INBOX'],
      }

      const result = gmailProvider.normalizeItem(message)

      expect(result.name).toBe('Héllo')
    })

    it('should handle case-insensitive encoding specifiers', () => {
      // Lowercase 'q' and 'utf-8'
      const encodedSubject = '=?utf-8?q?Hello_World?='

      const message = {
        id: 'msg130',
        threadId: 'thread130',
        raw: createRawMessage(encodedSubject),
        internalDate: '1736510400000',
        labelIds: ['INBOX'],
      }

      const result = gmailProvider.normalizeItem(message)

      expect(result.name).toBe('Hello World')
    })

    it('should default to (No Subject) for missing subject', () => {
      const rawContent = `From: test@example.com\r\nDate: Mon, 10 Jan 2026 12:00:00 +0000\r\n\r\nBody`
      const base64 = btoa(rawContent)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

      const message = {
        id: 'msg131',
        threadId: 'thread131',
        raw: base64,
        internalDate: '1736510400000',
        labelIds: ['INBOX'],
      }

      const result = gmailProvider.normalizeItem(message)

      expect(result.name).toBe('(No Subject)')
    })

    it('should handle multiple adjacent encoded words', () => {
      // Adjacent encoded words should be joined without space between them
      // This tests RFC 2047 section 6.2 behavior
      const encodedSubject = '=?UTF-8?Q?Hello?= =?UTF-8?Q?World?='

      const message = {
        id: 'msg132',
        threadId: 'thread132',
        raw: createRawMessage(encodedSubject),
        internalDate: '1736510400000',
        labelIds: ['INBOX'],
      }

      const result = gmailProvider.normalizeItem(message)

      // RFC 2047: whitespace between adjacent encoded words should be ignored
      // This means "Hello" + "World" = "HelloWorld" (no space)
      expect(result.name).toBe('HelloWorld')
    })

    it('should handle emoji in subject', () => {
      // "🎉 Party!" - party popper emoji
      const encodedSubject = '=?UTF-8?Q?=F0=9F=8E=89_Party!?='

      const message = {
        id: 'msg133',
        threadId: 'thread133',
        raw: createRawMessage(encodedSubject),
        internalDate: '1736510400000',
        labelIds: ['INBOX'],
      }

      const result = gmailProvider.normalizeItem(message)

      expect(result.name).toBe('🎉 Party!')
    })
  })
})
