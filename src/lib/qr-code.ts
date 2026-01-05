/**
 * Create a QR code data URL for the setup
 * Note: This function requires a QR code library to be installed
 * Example usage with qrcode library:
 *
 * ```bash
 * npm install qrcode @types/qrcode
 * ```
 *
 * ```typescript
 * import QRCode from 'qrcode'
 * import { generateSetupQRCode } from '@/lib/qr-code'
 *
 * const qrCodeDataUrl = await generateSetupQRCode(password, options)
 * ```
 */
export async function generateSetupQRCode(url: string): Promise<string> {
  // Dynamic import to avoid bundling QR code library if not used
  try {
    const QRCodeModule = await import('qrcode')
    const QRCode = QRCodeModule.default || QRCodeModule
    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      width: 256,
    })
  } catch (error) {
    console.warn(
      'QR code generation failed. Install "qrcode" package for QR code support:',
      error,
    )
    throw new Error(
      'QR code library not available. Install "qrcode" package to generate QR codes.',
    )
  }
}
