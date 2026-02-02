/**
 * Sync Panel Component
 *
 * Popover content for P2P sync settings.
 * Displays sync status, room sharing, and connection options.
 * This is the main sync UI - no separate settings page needed.
 */
import { Alert, Button, ButtonGroup, Chip, Input, Snippet } from '@heroui/react'
import { useState, useEffect, useCallback, useRef } from 'react'

import { useSyncStore } from '../stores/syncStore'
import { generateSetupQRCode } from '@/lib/qr-code'
import { Icon } from '@/components/Icon'
import { PageMenuPanel } from '@/components/PageMenuPanel'
import { useI18n } from '@/i18n'

/** Panel mode for UI state */
type PanelMode = 'initial' | 'scanning' | 'password-prompt'

export interface SyncPanelProps {
  /** Callback to close the panel/popover */
  onClose?: () => void
}

export function SyncPanel(_props: SyncPanelProps) {
  const { t } = useI18n()

  const {
    enabled,
    status,
    peerCount,
    roomId,
    enableSync,
    disableSync,
    generateRoomId,
  } = useSyncStore()

  // UI mode state
  const [mode, setMode] = useState<PanelMode>('initial')

  // Share form state
  const [isPasswordProtected, setIsPasswordProtected] = useState(false)
  const [password, setPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isEnabling, setIsEnabling] = useState(false)

  // Join state (for password-protected rooms)
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null)
  const [joinPassword, setJoinPassword] = useState('')
  const [isJoinPasswordVisible, setIsJoinPasswordVisible] = useState(false)

  // QR code state
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [qrCodeLoading, setQrCodeLoading] = useState(false)
  const qrCodeRef = useRef<string | null>(null)

  // QR scanner state
  const [scannerError, setScannerError] = useState<string | null>(null)
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<any>(null)

  const syncUrl = roomId
    ? `${window.location.origin}?join=${roomId}${isPasswordProtected ? '&protected=1' : ''}`
    : ''

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

  // Reset state when panel closes or sync is disabled
  useEffect(() => {
    if (!enabled) {
      setMode('initial')
      setPassword('')
      setIsPasswordVisible(false)
      setIsPasswordProtected(false)
      setPendingJoinCode(null)
      setJoinPassword('')
    }
  }, [enabled])

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
    setMode('initial')
    setScannerError(null)
  }, [])

  // Handle starting sync (share mode)
  const handleStartSync = useCallback(async () => {
    setIsEnabling(true)
    try {
      const newRoomId = generateRoomId()
      await enableSync(
        newRoomId,
        isPasswordProtected ? password || undefined : undefined,
        'share',
      )
    } finally {
      setIsEnabling(false)
    }
  }, [generateRoomId, enableSync, password, isPasswordProtected])

  // Handle joining a room with scanned/extracted code
  const handleJoinRoom = useCallback(
    async (roomCode: string, isProtected: boolean) => {
      if (isProtected) {
        // Room is password-protected, prompt for password
        setPendingJoinCode(roomCode)
        setMode('password-prompt')
        return
      }

      // Join directly without password
      setIsEnabling(true)
      try {
        await enableSync(roomCode, undefined, 'join')
      } finally {
        setIsEnabling(false)
      }
    },
    [enableSync],
  )

  // Handle joining with password after prompt
  const handleJoinWithPassword = useCallback(async () => {
    if (!pendingJoinCode) return
    setIsEnabling(true)
    try {
      await enableSync(pendingJoinCode, joinPassword || undefined, 'join')
    } finally {
      setIsEnabling(false)
      setPendingJoinCode(null)
      setJoinPassword('')
    }
  }, [pendingJoinCode, joinPassword, enableSync])

  // Start QR scanner (for Join mode)
  const startScanner = useCallback(async () => {
    setMode('scanning')
    setScannerError(null)

    // Wait for the DOM element to be available
    await new Promise((resolve) => setTimeout(resolve, 100))

    if (!scannerRef.current) return

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const html5QrCode = new Html5Qrcode(scannerRef.current.id)
      html5QrCodeRef.current = html5QrCode

      const onScanSuccess = async (decodedText: string) => {
        // Stop scanner first
        await stopScanner()

        // Extract room ID and protected flag from the scanned URL
        try {
          const scannedUrl = new URL(decodedText)
          const joinParam =
            scannedUrl.searchParams.get('join') ||
            scannedUrl.searchParams.get('room')
          const isProtected = scannedUrl.searchParams.get('protected') === '1'

          if (joinParam) {
            handleJoinRoom(joinParam, isProtected)
          }
        } catch {
          // If it's not a valid URL, try using it as a room ID directly
          if (decodedText.trim()) {
            handleJoinRoom(decodedText.trim(), false)
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
  }, [stopScanner, handleJoinRoom, t])

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().catch(() => {})
        } catch {
          // Scanner might not be running (e.g., camera access denied)
        }
      }
    }
  }, [])

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

  // Render initial step with Share (with password toggle) and Join CTAs
  const renderInitialStep = () => (
    <div className="flex flex-col gap-3">
      {/* Share section */}
      <div className="flex flex-col gap-2">
        <ButtonGroup fullWidth color="primary" variant="flat" size="sm">
          <Button onPress={handleStartSync} isLoading={isEnabling}>
            {t('Share')}
          </Button>
          <Button
            isIconOnly
            onPress={() => setIsPasswordProtected(!isPasswordProtected)}
            className={isPasswordProtected ? 'bg-primary-200' : ''}
          >
            <Icon name={isPasswordProtected ? 'Lock' : 'LockSlash'} />
          </Button>
        </ButtonGroup>

        {/* Inline password input when protection is enabled */}
        {isPasswordProtected && (
          <Input
            value={password}
            onValueChange={setPassword}
            placeholder={t('Sync password')}
            size="sm"
            type={isPasswordVisible ? 'text' : 'password'}
            description={t(
              'Set a password to sync API keys across devices. All devices must use the same password.',
            )}
            endContent={
              <button
                type="button"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                className="focus:outline-none"
              >
                <Icon
                  name={isPasswordVisible ? 'EyeClosed' : 'Eye'}
                  className="h-4 w-4 text-default-400 pointer-events-none"
                />
              </button>
            }
          />
        )}
      </div>

      {/* Join button - directly starts QR scanning */}
      <Button
        variant="bordered"
        size="sm"
        onPress={startScanner}
        startContent={<Icon name="QrCode" />}
      >
        {t('Scan & Join')}
      </Button>
    </div>
  )

  // Render QR scanning mode
  const renderScanningMode = () => (
    <div className="flex flex-col gap-3">
      {/* Back button */}
      <Button
        size="sm"
        variant="light"
        onPress={stopScanner}
        startContent={<Icon name="ArrowLeft" className="h-4 w-4" />}
        className="self-start -ms-2 -mt-1"
      >
        {t('Back')}
      </Button>

      {/* QR Scanner */}
      <div className="flex flex-col gap-2">
        {/* <span className="text-xs font-medium">{t('Scan QR Code')}</span> */}
        {scannerError ? (
          <Alert
            color="danger"
            variant="flat"
            icon={<Icon name="VideoCameraOff" />}
            title={t('Camera access denied')}
            // endContent={
            //   <Button
            //     isIconOnly
            //     size="sm"
            //     variant="flat"
            //     onPress={startScanner}
            //   >
            //     <Icon name="Refresh" aria-label={t('Try Again')} />
            //   </Button>
            // }
          >
            {scannerError}
          </Alert>
        ) : (
          // <div className="flex flex-col items-center gap-2 p-3 bg-danger-50 rounded-lg">
          //   <Icon name="WarningTriangle" className="h-6 w-6 text-danger" />
          //   <p className="text-xs text-danger text-center">{scannerError}</p>
          //   <Button size="sm" variant="flat" onPress={startScanner}>
          //     {t('Try Again')}
          //   </Button>
          // </div>
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
    </div>
  )

  // Render password prompt for protected rooms
  const renderPasswordPrompt = () => (
    <div className="flex flex-col gap-3">
      {/* Back button */}
      <Button
        size="sm"
        variant="light"
        onPress={() => {
          setPendingJoinCode(null)
          setJoinPassword('')
          setMode('initial')
        }}
        startContent={<Icon name="ArrowLeft" className="h-4 w-4" />}
        className="self-start -ms-2 -mt-1"
      >
        {t('Back')}
      </Button>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="Lock" className="h-4 w-4 text-warning" />
          <span className="text-sm font-medium">{t('Password Required')}</span>
        </div>
        <p className="text-xs text-default-500 mb-2">
          {t('This room is password-protected. Enter the password to join.')}
        </p>
        <Input
          value={joinPassword}
          onValueChange={setJoinPassword}
          placeholder={t('Enter the room password')}
          size="sm"
          type={isJoinPasswordVisible ? 'text' : 'password'}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleJoinWithPassword()
          }}
          endContent={
            <button
              type="button"
              onClick={() => setIsJoinPasswordVisible(!isJoinPasswordVisible)}
              className="focus:outline-none"
            >
              <Icon
                name={isJoinPasswordVisible ? 'EyeClosed' : 'Eye'}
                className="h-4 w-4 text-default-400 pointer-events-none"
              />
            </button>
          }
        />
      </div>

      <Button
        color="primary"
        variant="flat"
        size="sm"
        isLoading={isEnabling}
        onPress={handleJoinWithPassword}
      >
        {t('Join Room')}
      </Button>
    </div>
  )

  // Render connected state
  const renderConnectedState = () => (
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
  )

  return (
    <PageMenuPanel
      title={
        <span className="flex items-center">
          {t('Sync')}
          <Chip size="sm" variant="flat" className="ms-2 align-middle">
            Beta
          </Chip>
        </span>
      }
      status={{
        text: getStatusText(),
        color: getStatusColor(),
        onClose: enabled ? disableSync : undefined,
        closeLabel: t('Disconnect'),
      }}
      description={
        !enabled && mode === 'initial' ? (
          <>
            {t('Sync your data across devices in real-time.')}{' '}
            {t('No server needed - data transits between your devices.')}
          </>
        ) : undefined
      }
    >
      {/* Not enabled state */}
      {!enabled && (
        <>
          {mode === 'initial' && renderInitialStep()}
          {mode === 'scanning' && renderScanningMode()}
          {mode === 'password-prompt' && renderPasswordPrompt()}
        </>
      )}

      {/* Enabled state */}
      {enabled && renderConnectedState()}
    </PageMenuPanel>
  )
}
