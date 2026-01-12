/**
 * Sync Panel Component
 *
 * Popover content for P2P sync settings.
 * Displays sync status, room sharing, and connection options.
 */
import { Button, Input, RadioGroup, Snippet, Tooltip } from '@heroui/react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { CustomRadio } from './CustomRadio'
import { useSyncStore, type SyncMode } from '../stores/syncStore'
import { generateSetupQRCode } from '@/lib/qr-code'
import { Icon } from '@/components/Icon'
import { PageMenuPanel } from '@/components/PageMenuPanel'
import { useI18n, useUrl } from '@/i18n'

export interface SyncPanelProps {
  /** Callback to close the panel/popover */
  onClose?: () => void
}

export function SyncPanel({ onClose }: SyncPanelProps) {
  const { lang, t } = useI18n()
  const url = useUrl(lang)
  const navigate = useNavigate()

  const {
    enabled,
    status,
    peerCount,
    roomId,
    enableSync,
    disableSync,
    generateRoomId,
  } = useSyncStore()

  const [selectedMode, setSelectedMode] = useState<SyncMode>('share')
  const [joinCode, setJoinCode] = useState('')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [qrCodeLoading, setQrCodeLoading] = useState(false)
  const qrCodeRef = useRef<string | null>(null)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const scannerRef = useRef<HTMLDivElement>(null)

  const html5QrCodeRef = useRef<any>(null)

  const syncUrl = `${window.location.origin}${url('')}?join=${roomId}`

  // Generate QR code when sync is enabled
  useEffect(() => {
    if (enabled && roomId && status === 'connected') {
      // Avoid regenerating if URL hasn't changed
      if (qrCodeRef.current === syncUrl) return
      qrCodeRef.current = syncUrl

      setQrCodeLoading(true)
      generateSetupQRCode(syncUrl)
        .then((dataUrl) => {
          setQrCodeDataUrl(dataUrl)
          setQrCodeLoading(false)
        })
        .catch(() => {
          setQrCodeLoading(false)
        })
    } else {
      qrCodeRef.current = null
      setQrCodeDataUrl(null)
    }
  }, [enabled, roomId, status, syncUrl])

  // Handle starting sync (share mode)
  const handleStartSync = useCallback(async () => {
    const newRoomId = generateRoomId()
    await enableSync(newRoomId, undefined, 'share')
  }, [generateRoomId, enableSync])

  // Handle joining a room
  const handleJoinRoom = useCallback(async () => {
    if (!joinCode.trim()) return
    await enableSync(joinCode.trim(), undefined, 'join')
    setJoinCode('')
  }, [joinCode, enableSync])

  // Stop QR scanner
  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current.clear()
      } catch {
        // Scanner might already be stopped
      }
      html5QrCodeRef.current = null
    }
    setIsScannerOpen(false)
    setScannerError(null)
  }, [])

  // Start QR scanner
  const startScanner = useCallback(async () => {
    setIsScannerOpen(true)
    setScannerError(null)

    // Wait for the DOM element to be available
    await new Promise((resolve) => setTimeout(resolve, 100))

    if (!scannerRef.current) return

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const html5QrCode = new Html5Qrcode(scannerRef.current.id)
      html5QrCodeRef.current = html5QrCode

      const onScanSuccess = (decodedText: string) => {
        // Extract room ID from the scanned URL
        try {
          const scannedUrl = new URL(decodedText)
          const joinParam =
            scannedUrl.searchParams.get('join') ||
            scannedUrl.searchParams.get('room')
          if (joinParam) {
            stopScanner()
            enableSync(joinParam, undefined, 'join')
          }
        } catch {
          // If it's not a valid URL, try using it as a room ID directly
          if (decodedText.trim()) {
            stopScanner()
            enableSync(decodedText.trim(), undefined, 'join')
          }
        }
      }

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 200, height: 200 },
        },
        onScanSuccess,
        () => {}, // Ignore scan errors (they happen continuously until a valid code is found)
      )
    } catch (err) {
      console.error('Failed to start QR scanner:', err)
      setScannerError(
        t('Unable to access camera. Please grant camera permissions.'),
      )
    }
  }, [stopScanner, enableSync, t])

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {})
      }
    }
  }, [])

  // Handle navigate to full settings
  const handleOpenSettings = useCallback(() => {
    onClose?.()
    navigate(url('/sync'))
  }, [navigate, url, onClose])

  // Get status chip color
  const getStatusColor = () => {
    if (status === 'connected') return 'success'
    if (status === 'connecting') return 'warning'
    return 'default'
  }

  // Get status text (includes peer count when connected)
  const getStatusText = () => {
    if (status === 'connected') {
      const peerText =
        peerCount === 1
          ? t('{count} peer').replace('{count}', '1')
          : t('{count} peers').replace('{count}', String(peerCount))
      return `${t('Connected')} · ${peerText}`
    }
    if (status === 'connecting') return t('Connecting...')
    return t('Offline')
  }

  return (
    <PageMenuPanel
      title={t('Sync')}
      actions={
        <Tooltip content={t('Sync Settings')}>
          <Button
            size="sm"
            variant="light"
            isIconOnly
            className="h-6 w-6 min-w-6"
            onPress={handleOpenSettings}
            aria-label={t('Sync Settings')}
          >
            <Icon name="Settings" className="h-4 w-4" />
          </Button>
        </Tooltip>
      }
      status={{
        text: getStatusText(),
        color: getStatusColor(),
        onClose: enabled ? disableSync : undefined,
        closeLabel: t('Disconnect'),
      }}
      description={
        !enabled ? (
          <>
            {t('Sync your data across devices in real-time.')}{' '}
            {t('No server needed - data stays between your devices.')}
          </>
        ) : undefined
      }
    >
      {/* Not enabled state */}
      {!enabled && (
        <div className="flex flex-col gap-3">
          {/* Mode selector */}
          <RadioGroup
            value={selectedMode}
            onValueChange={(v) => setSelectedMode(v as SyncMode)}
            size="sm"
          >
            <CustomRadio
              value="share"
              size="sm"
              description={t('Create a new sync room')}
            >
              {t('Share')}
            </CustomRadio>
            <CustomRadio
              value="join"
              size="sm"
              description={t('Join an existing room')}
            >
              {t('Join')}
            </CustomRadio>
          </RadioGroup>

          {/* Share mode */}
          {selectedMode === 'share' && (
            <Button
              color="primary"
              variant="flat"
              size="sm"
              onPress={handleStartSync}
            >
              {t('Start Sync')}
            </Button>
          )}

          {/* Join mode */}
          {selectedMode === 'join' && (
            <div className="flex flex-col gap-2">
              {/* QR Scanner Section */}
              {isScannerOpen ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">
                      {t('Scan QR Code')}
                    </span>
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      onPress={stopScanner}
                      className="h-6 min-w-0 px-2"
                    >
                      {t('Stop Scanner')}
                    </Button>
                  </div>
                  {scannerError ? (
                    <div className="flex flex-col items-center gap-2 p-3 bg-danger-50 rounded-lg">
                      <Icon
                        name="WarningTriangle"
                        className="h-6 w-6 text-danger"
                      />
                      <p className="text-xs text-danger text-center">
                        {scannerError}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <div
                        id="sync-panel-qr-scanner"
                        ref={scannerRef}
                        className="w-full aspect-square rounded-lg overflow-hidden bg-black"
                      />
                      <p className="text-xs text-default-400">
                        {t('Point your camera at a sync QR code')}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  variant="bordered"
                  size="sm"
                  onPress={startScanner}
                  startContent={<Icon name="Camera" className="h-4 w-4" />}
                  className="w-full"
                >
                  {t('Scan QR Code')}
                </Button>
              )}

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-default-200" />
                <span className="text-xs text-default-400">{t('or')}</span>
                <div className="flex-1 h-px bg-default-200" />
              </div>

              <div className="flex gap-2">
                <Input
                  size="sm"
                  placeholder={t('Enter room code')}
                  value={joinCode}
                  onValueChange={setJoinCode}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleJoinRoom()
                  }}
                  className="flex-1"
                />
                <Button
                  color="primary"
                  variant="flat"
                  size="sm"
                  isDisabled={!joinCode.trim()}
                  onPress={handleJoinRoom}
                >
                  {t('Join Room')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enabled state */}
      {enabled && (
        <div className="flex flex-col gap-3">
          {/* Room code snippet */}
          {roomId && (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-default-500">
                {t('Share this code or link with other devices:')}
              </span>
              <Snippet
                symbol=""
                size="sm"
                variant="bordered"
                copyIcon={<Icon name="Copy" />}
                tooltipProps={{ content: t('Copy to clipboard') }}
                classNames={{
                  base: 'bg-default-50 border-default-200 w-full',
                  pre: 'whitespace-pre-wrap break-all max-h-8 overflow-y-hidden',
                }}
              >
                {syncUrl}
              </Snippet>
            </div>
          )}

          {/* QR Code */}
          {qrCodeLoading && (
            <div className="flex items-center justify-center py-4">
              <span className="text-xs text-default-400">
                {t('Generating QR Code...')}
              </span>
            </div>
          )}
          {qrCodeDataUrl && !qrCodeLoading && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-default-500">
                {t('Or scan this QR Code:')}
              </span>
              <img
                src={qrCodeDataUrl}
                alt="Sync QR Code"
                className="w-full h-full rounded-lg"
              />
            </div>
          )}
        </div>
      )}
    </PageMenuPanel>
  )
}
