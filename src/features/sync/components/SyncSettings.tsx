/**
 * Sync Settings Component
 *
 * UI for enabling/disabling P2P sync with Share/Join modes.
 */
import {
  Accordion,
  AccordionItem,
  Button,
  Chip,
  Divider,
  Input,
  Progress,
  RadioGroup,
  Snippet,
} from '@heroui/react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { CustomRadio } from './CustomRadio'
import { useSyncStore } from '../stores/syncStore'
import { generateSetupQRCode } from '@/lib/qr-code'
import { Icon } from '@/components/Icon'
import { SyncActivityDetails } from './SyncActivityDetails'
import { PeerNetworkGraph } from './PeerNetworkGraph'
import { useI18n, useUrl } from '@/i18n'

export function SyncSettings() {
  const { lang, t } = useI18n()
  const url = useUrl(lang)
  const navigate = useNavigate()
  const {
    enabled,
    roomId,
    status,
    peerCount,
    peers,
    recentActivity,
    enableSync,
    disableSync,
    generateRoomId,
  } = useSyncStore()

  const [selectedOption, setSelectedOption] = useState<string>('offline')
  const [inputRoomId, setInputRoomId] = useState('')
  const [isEnabling, setIsEnabling] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [qrCodeError, setQrCodeError] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<any>(null)

  // Generate sync link URL
  const getSyncLink = (roomIdToUse: string) => {
    return `${window.location.origin}${url(`?join=${roomIdToUse}`)}`
  }

  // Generate QR code when sync is active (for any peer to share)
  useEffect(() => {
    if (enabled && roomId) {
      const generateQR = async () => {
        try {
          setQrCodeError(false)
          const dataUrl = await generateSetupQRCode(getSyncLink(roomId))
          setQrCodeDataUrl(dataUrl)
        } catch {
          setQrCodeError(true)
        }
      }
      generateQR()
    } else {
      setQrCodeDataUrl(null)
    }
  }, [enabled, roomId])

  // Handle starting share mode
  const handleStartSharing = async () => {
    setIsEnabling(true)
    try {
      const newRoomId = generateRoomId()
      await enableSync(newRoomId, undefined, 'share')
    } finally {
      setIsEnabling(false)
    }
  }

  // Handle stopping share/sync
  const handleStopSync = () => {
    disableSync()
    setQrCodeDataUrl(null)
  }

  // Handle join mode
  const handleJoinSync = async () => {
    if (!inputRoomId.trim()) return

    setIsEnabling(true)
    try {
      // Redirect to sync link - this will trigger the join flow
      navigate(url(`?join=${inputRoomId.trim()}`))
    } finally {
      setIsEnabling(false)
    }
  }

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
          const joinParam = scannedUrl.searchParams.get('join')
          if (joinParam) {
            stopScanner()
            navigate(url(`?join=${joinParam}`))
          }
        } catch {
          // If it's not a valid URL, try using it as a room ID directly
          if (decodedText.trim()) {
            stopScanner()
            navigate(url(`?join=${decodedText.trim()}`))
          }
        }
      }

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
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
  }, [navigate, url, stopScanner, t])

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'success'
      case 'connecting':
        return 'warning'
      default:
        return 'default'
    }
  }

  // If sync is already enabled, show the active state
  if (enabled && roomId) {
    return (
      <div className="flex flex-col gap-6 w-full">
        {/* Connection Status Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-xs text-default-400">
                {status === 'connected'
                  ? `${peerCount} ${peerCount === 1 ? t('{count} peer', { count: '' }).replace('{count}', '').trim() : t('{count} peers', { count: '' }).replace('{count}', '').trim()}`
                  : t('Connecting...')}
              </span>
            </div>
          </div>
          <Chip
            color={getStatusColor()}
            variant="dot"
            size="sm"
            classNames={{
              dot: status === 'connected' ? 'animate-pulse' : '',
            }}
          >
            {status === 'connected' ? t('Connected') : t('Connecting...')}
          </Chip>
        </div>

        {/* QR Code Section - Mobile-first: stacked on mobile, side by side on larger screens */}
        <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 py-2">
          {/* QR Code - Centered on mobile, left on desktop */}
          <div className="flex flex-col items-center justify-center shrink-0">
            {qrCodeDataUrl ? (
              <div className="p-3 bg-white rounded-2xl shadow-sm">
                <img
                  src={qrCodeDataUrl}
                  alt="Sync QR Code"
                  className="w-36 h-36 sm:w-32 sm:h-32"
                />
              </div>
            ) : qrCodeError ? (
              <div className="flex flex-col items-center gap-2 p-4 bg-danger-50/50 rounded-2xl">
                <Icon name="Xmark" className="h-6 w-6 text-danger-400" />
                <span className="text-xs text-danger-600">
                  {t('QR Code generation failed')}
                </span>
              </div>
            ) : (
              <div className="w-[168px] h-[168px] sm:w-[152px] sm:h-[152px] flex items-center justify-center bg-default-100 rounded-2xl">
                <Progress
                  isIndeterminate
                  size="sm"
                  className="max-w-[80px]"
                  aria-label={t('Generating QR Code...')}
                />
              </div>
            )}
          </div>

          {/* Divider - Horizontal on mobile, vertical on desktop */}
          <Divider orientation="horizontal" className="sm:hidden" />
          <Divider orientation="vertical" className="hidden sm:block h-auto" />

          {/* Instructions */}
          <div className="flex flex-col gap-4 flex-1 justify-center">
            {/* Option 1: Scan QR */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Icon name="Camera" className="h-4 w-4 text-primary-500" />
                <span className="text-sm font-medium text-default-700">
                  {t('Scan the QR Code')}
                </span>
              </div>
              <p className="text-xs text-default-500">
                {t(
                  'Use another device to scan this QR code to connect instantly.',
                )}
              </p>
            </div>

            {/* Option 2: Share link */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Icon name="Share" className="h-4 w-4 text-primary-500" />
                <span className="text-sm font-medium text-default-700">
                  {t('Share the secret link')}
                </span>
              </div>
              <p className="text-xs text-default-500">
                {t(
                  'Copy and share this unique link with your other device. Keep it private!',
                )}
              </p>
              <Snippet
                symbol=""
                size="sm"
                variant="bordered"
                copyIcon={<Icon name="Copy" />}
                tooltipProps={{ content: t('Copy to clipboard') }}
                classNames={{
                  base: 'bg-default-50 border-default-200 w-full',
                  pre: 'whitespace-pre-wrap break-all max-h-16 overflow-y-hidden',
                }}
              >
                {getSyncLink(roomId)}
              </Snippet>
            </div>
          </div>
        </div>

        {/* Peer Network Graph - Show when peers are connected */}
        {peers.length > 0 && (
          <div className="flex justify-center py-2 overflow-hidden">
            <PeerNetworkGraph
              peers={peers}
              status={status}
              localLabel={t('You')}
              peerLabel={t('Peer')}
              emptyLabel={t('No activity')}
            />
          </div>
        )}

        <Divider />

        {/* Activity Details - Collapsible */}
        <Accordion isCompact variant="light">
          <AccordionItem
            key="activity"
            aria-label={t('Activity Details')}
            title={
              <span className="text-sm text-default-500">
                {t('Activity Details')}
              </span>
            }
            classNames={{
              content: 'pt-0',
            }}
          >
            <SyncActivityDetails
              recentActivity={recentActivity}
              status={status}
            />
          </AccordionItem>
        </Accordion>

        {/* Stop Button */}
        <Button
          color="danger"
          variant="flat"
          onPress={handleStopSync}
          startContent={<Icon name="Xmark" className="h-4 w-4" />}
          className="mt-2"
        >
          {t('Disconnect')}
        </Button>
      </div>
    )
  }

  // Show privacy reassurance with Create/Join options when not connected
  return (
    <div className="flex flex-col gap-4">
      <RadioGroup
        value={selectedOption}
        onValueChange={setSelectedOption}
        className="p-4 rounded-lg bg-default-100 dark:bg-default-50/10"
      >
        <CustomRadio
          value="offline"
          description={t(
            'Everything runs in your browser. Your conversations, agents, and data are stored locally on your device and never sent to any server.',
          )}
        >
          <div className="flex items-center gap-2">
            <Icon name="CloudXmark" className="h-4 w-4 text-default-500" />
            {t('Work Offline')}
          </div>
        </CustomRadio>

        <CustomRadio
          value="share"
          description={t(
            'Enable peer-to-peer sync to share data between your devices or with others. Data travels directly between devices.',
          )}
        >
          <div className="flex items-center gap-2">
            <Icon name="CloudSync" className="h-4 w-4 text-default-500" />
            {t('Share')}
            <Chip size="sm" variant="flat" className="ml-2 align-middle">
              Beta
            </Chip>
          </div>
        </CustomRadio>

        <CustomRadio
          value="join"
          description={t('Connect to an existing device with a code')}
        >
          <div className="flex items-center gap-2">
            <Icon name="CloudSync" className="h-4 w-4 text-default-500" />
            {t('Join a device')}
            <Chip size="sm" variant="flat" className="ml-2 align-middle">
              Beta
            </Chip>
          </div>
        </CustomRadio>
      </RadioGroup>

      {/* Share Action */}
      {selectedOption === 'share' && (
        <Button
          color="primary"
          onPress={handleStartSharing}
          isLoading={isEnabling}
          startContent={
            !isEnabling && <Icon name="CloudSync" className="h-4 w-4" />
          }
          className="w-full"
        >
          {t('Synchronize with devices')}
        </Button>
      )}

      {/* Join Action */}
      {selectedOption === 'join' && (
        <div className="flex flex-col gap-3">
          {/* QR Scanner Section */}
          {isScannerOpen ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  {t('Scan QR Code')}
                </label>
                <Button
                  size="sm"
                  variant="flat"
                  color="danger"
                  onPress={stopScanner}
                  startContent={<Icon name="Xmark" className="h-4 w-4" />}
                >
                  {t('Stop Scanner')}
                </Button>
              </div>
              {scannerError ? (
                <div className="flex flex-col items-center gap-2 p-4 bg-danger-50 rounded-lg">
                  <Icon
                    name="WarningTriangle"
                    className="h-8 w-8 text-danger"
                  />
                  <p className="text-sm text-danger text-center">
                    {scannerError}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div
                    id="qr-scanner-container"
                    ref={scannerRef}
                    className="w-full max-w-[300px] aspect-square rounded-lg overflow-hidden bg-black"
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
              onPress={startScanner}
              startContent={<Icon name="Camera" className="h-4 w-4" />}
              className="w-full"
            >
              {t('Scan QR Code')}
            </Button>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-default-200" />
            <span className="text-xs text-default-400">{t('or')}</span>
            <div className="flex-1 h-px bg-default-200" />
          </div>

          {/* Manual Room ID Entry */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">{t('Code')}</label>
            <div className="flex gap-2">
              <Input
                value={inputRoomId}
                onValueChange={setInputRoomId}
                placeholder={t('Enter or paste a code')}
                size="sm"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleJoinSync()}
              />
              <Button
                color="primary"
                size="sm"
                onPress={handleJoinSync}
                isLoading={isEnabling}
                isDisabled={!inputRoomId.trim()}
              >
                {t('Join')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
