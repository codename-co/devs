/**
 * Sync Settings Component
 *
 * UI for enabling/disabling P2P sync with Share/Join modes.
 */
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Snippet,
  Tab,
  Tabs,
} from '@heroui/react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { useSyncStore, type SyncMode } from '@/stores/syncStore'
import { generateSetupQRCode } from '@/lib/qr-code'
import { Icon } from '@/components/Icon'
import { useI18n, useUrl } from '@/i18n'

const localI18n = {
  en: [
    'Share',
    'Join',
    'Stop Sharing',
    'Start Sharing',
    'Share your data with other devices',
    'Join an existing sync session',
    'Sync Link',
    'Copy Link',
    'Copied!',
    'Or scan this QR Code:',
    'Generating QR Code...',
    'QR Code generation failed',
    'Room ID',
    'Enter or paste a Room ID',
    'Join Sync',
    'Leave Sync',
    'Status:',
    'Connected',
    'Connecting...',
    'Disabled',
    '{count} peer',
    '{count} peers',
    'Sharing is active! Other devices can join using the link or QR code above.',
    'Click "Start Sharing" to generate a sync link that other devices can use to connect.',
    'Joined a sync session. Your data is syncing with the host.',
    'Enter the Room ID from the host device, or use a sync link directly.',
    'Scan QR Code',
    'Scan a QR code to join',
    'Point your camera at a sync QR code',
    'Camera access denied',
    'Unable to access camera. Please grant camera permissions.',
    'Stop Scanner',
    'or',
  ] as const,
  fr: {
    Share: 'Partager',
    Join: 'Rejoindre',
    'Stop Sharing': 'Arrêter le partage',
    'Start Sharing': 'Commencer le partage',
    'Share your data with other devices':
      "Partagez vos données avec d'autres appareils",
    'Join an existing sync session':
      'Rejoindre une session de synchronisation existante',
    'Sync Link': 'Lien de synchronisation',
    'Copy Link': 'Copier le lien',
    'Copied!': 'Copié !',
    'Or scan this QR Code:': 'Ou scannez ce QR Code :',
    'Generating QR Code...': 'Génération du QR Code...',
    'QR Code generation failed': 'Échec de la génération du QR Code',
    'Room ID': 'ID de la salle',
    'Enter or paste a Room ID': 'Entrez ou collez un ID de salle',
    'Join Sync': 'Rejoindre la sync',
    'Leave Sync': 'Quitter la sync',
    'Status:': 'Statut :',
    Connected: 'Connecté',
    'Connecting...': 'Connexion...',
    Disabled: 'Désactivé',
    '{count} peer': '{count} pair',
    '{count} peers': '{count} pairs',
    'Sharing is active! Other devices can join using the link or QR code above.':
      'Le partage est actif ! Les autres appareils peuvent rejoindre via le lien ou le QR code ci-dessus.',
    'Click "Start Sharing" to generate a sync link that other devices can use to connect.':
      'Cliquez sur "Commencer le partage" pour générer un lien de synchronisation.',
    'Joined a sync session. Your data is syncing with the host.':
      "Vous avez rejoint une session de synchronisation. Vos données se synchronisent avec l'hôte.",
    'Enter the Room ID from the host device, or use a sync link directly.':
      "Entrez l'ID de salle de l'appareil hôte, ou utilisez directement un lien de synchronisation.",
    'Scan QR Code': 'Scanner un QR Code',
    'Scan a QR code to join': 'Scannez un QR code pour rejoindre',
    'Point your camera at a sync QR code':
      'Pointez votre caméra vers un QR code de synchronisation',
    'Camera access denied': 'Accès à la caméra refusé',
    'Unable to access camera. Please grant camera permissions.':
      "Impossible d'accéder à la caméra. Veuillez autoriser l'accès à la caméra.",
    'Stop Scanner': 'Arrêter le scanner',
    or: 'ou',
  },
  es: {
    Share: 'Compartir',
    Join: 'Unirse',
    'Stop Sharing': 'Dejar de compartir',
    'Start Sharing': 'Comenzar a compartir',
    'Share your data with other devices':
      'Comparte tus datos con otros dispositivos',
    'Join an existing sync session':
      'Unirse a una sesión de sincronización existente',
    'Sync Link': 'Enlace de sincronización',
    'Copy Link': 'Copiar enlace',
    'Copied!': '¡Copiado!',
    'Or scan this QR Code:': 'O escanea este código QR:',
    'Generating QR Code...': 'Generando código QR...',
    'QR Code generation failed': 'Error al generar el código QR',
    'Room ID': 'ID de la sala',
    'Enter or paste a Room ID': 'Ingresa o pega un ID de sala',
    'Join Sync': 'Unirse a la sync',
    'Leave Sync': 'Salir de la sync',
    'Status:': 'Estado:',
    Connected: 'Conectado',
    'Connecting...': 'Conectando...',
    Disabled: 'Deshabilitado',
    '{count} peer': '{count} par',
    '{count} peers': '{count} pares',
    'Sharing is active! Other devices can join using the link or QR code above.':
      '¡El compartir está activo! Otros dispositivos pueden unirse usando el enlace o código QR de arriba.',
    'Click "Start Sharing" to generate a sync link that other devices can use to connect.':
      'Haz clic en "Comenzar a compartir" para generar un enlace de sincronización.',
    'Joined a sync session. Your data is syncing with the host.':
      'Te has unido a una sesión de sincronización. Tus datos se están sincronizando con el host.',
    'Enter the Room ID from the host device, or use a sync link directly.':
      'Ingresa el ID de sala del dispositivo host, o usa un enlace de sincronización directamente.',
    'Scan QR Code': 'Escanear código QR',
    'Scan a QR code to join': 'Escanea un código QR para unirte',
    'Point your camera at a sync QR code':
      'Apunta tu cámara a un código QR de sincronización',
    'Camera access denied': 'Acceso a la cámara denegado',
    'Unable to access camera. Please grant camera permissions.':
      'No se puede acceder a la cámara. Por favor, otorga permisos de cámara.',
    'Stop Scanner': 'Detener escáner',
    or: 'o',
  },
  de: {
    Share: 'Teilen',
    Join: 'Beitreten',
    'Stop Sharing': 'Teilen beenden',
    'Start Sharing': 'Teilen starten',
    'Share your data with other devices':
      'Teilen Sie Ihre Daten mit anderen Geräten',
    'Join an existing sync session': 'Einer bestehenden Sync-Sitzung beitreten',
    'Sync Link': 'Sync-Link',
    'Copy Link': 'Link kopieren',
    'Copied!': 'Kopiert!',
    'Or scan this QR Code:': 'Oder scannen Sie diesen QR-Code:',
    'Generating QR Code...': 'QR-Code wird generiert...',
    'QR Code generation failed': 'QR-Code-Generierung fehlgeschlagen',
    'Room ID': 'Raum-ID',
    'Enter or paste a Room ID':
      'Geben Sie eine Raum-ID ein oder fügen Sie sie ein',
    'Join Sync': 'Sync beitreten',
    'Leave Sync': 'Sync verlassen',
    'Status:': 'Status:',
    Connected: 'Verbunden',
    'Connecting...': 'Verbinden...',
    Disabled: 'Deaktiviert',
    '{count} peer': '{count} Peer',
    '{count} peers': '{count} Peers',
    'Sharing is active! Other devices can join using the link or QR code above.':
      'Das Teilen ist aktiv! Andere Geräte können über den Link oder QR-Code oben beitreten.',
    'Click "Start Sharing" to generate a sync link that other devices can use to connect.':
      'Klicken Sie auf "Teilen starten", um einen Sync-Link zu generieren.',
    'Joined a sync session. Your data is syncing with the host.':
      'Sie sind einer Sync-Sitzung beigetreten. Ihre Daten werden mit dem Host synchronisiert.',
    'Enter the Room ID from the host device, or use a sync link directly.':
      'Geben Sie die Raum-ID vom Host-Gerät ein oder verwenden Sie direkt einen Sync-Link.',
    'Scan QR Code': 'QR-Code scannen',
    'Scan a QR code to join': 'Scannen Sie einen QR-Code zum Beitreten',
    'Point your camera at a sync QR code':
      'Richten Sie Ihre Kamera auf einen Sync-QR-Code',
    'Camera access denied': 'Kamerazugriff verweigert',
    'Unable to access camera. Please grant camera permissions.':
      'Kamera nicht zugänglich. Bitte erteilen Sie Kameraberechtigungen.',
    'Stop Scanner': 'Scanner stoppen',
    or: 'oder',
  },
  ar: {
    Share: 'مشاركة',
    Join: 'انضمام',
    'Stop Sharing': 'إيقاف المشاركة',
    'Start Sharing': 'بدء المشاركة',
    'Share your data with other devices': 'شارك بياناتك مع الأجهزة الأخرى',
    'Join an existing sync session': 'انضم إلى جلسة مزامنة موجودة',
    'Sync Link': 'رابط المزامنة',
    'Copy Link': 'نسخ الرابط',
    'Copied!': 'تم النسخ!',
    'Or scan this QR Code:': 'أو امسح رمز QR:',
    'Generating QR Code...': 'جاري إنشاء رمز QR...',
    'QR Code generation failed': 'فشل إنشاء رمز QR',
    'Room ID': 'معرف الغرفة',
    'Enter or paste a Room ID': 'أدخل أو الصق معرف الغرفة',
    'Join Sync': 'انضمام للمزامنة',
    'Leave Sync': 'مغادرة المزامنة',
    'Status:': 'الحالة:',
    Connected: 'متصل',
    'Connecting...': 'جاري الاتصال...',
    Disabled: 'معطل',
    '{count} peer': '{count} نظير',
    '{count} peers': '{count} نظراء',
    'Sharing is active! Other devices can join using the link or QR code above.':
      'المشاركة نشطة! يمكن للأجهزة الأخرى الانضمام باستخدام الرابط أو رمز QR أعلاه.',
    'Click "Start Sharing" to generate a sync link that other devices can use to connect.':
      'انقر على "بدء المشاركة" لإنشاء رابط مزامنة يمكن للأجهزة الأخرى استخدامه للاتصال.',
    'Joined a sync session. Your data is syncing with the host.':
      'انضممت إلى جلسة مزامنة. يتم مزامنة بياناتك مع المضيف.',
    'Enter the Room ID from the host device, or use a sync link directly.':
      'أدخل معرف الغرفة من الجهاز المضيف، أو استخدم رابط مزامنة مباشرة.',
    'Scan QR Code': 'مسح رمز QR',
    'Scan a QR code to join': 'امسح رمز QR للانضمام',
    'Point your camera at a sync QR code': 'وجّه الكاميرا نحو رمز QR للمزامنة',
    'Camera access denied': 'تم رفض الوصول إلى الكاميرا',
    'Unable to access camera. Please grant camera permissions.':
      'تعذر الوصول إلى الكاميرا. يرجى منح أذونات الكاميرا.',
    'Stop Scanner': 'إيقاف الماسح',
    or: 'أو',
  },
  ko: {
    Share: '공유',
    Join: '참가',
    'Stop Sharing': '공유 중지',
    'Start Sharing': '공유 시작',
    'Share your data with other devices': '다른 기기와 데이터를 공유하세요',
    'Join an existing sync session': '기존 동기화 세션에 참가',
    'Sync Link': '동기화 링크',
    'Copy Link': '링크 복사',
    'Copied!': '복사됨!',
    'Or scan this QR Code:': '또는 이 QR 코드를 스캔하세요:',
    'Generating QR Code...': 'QR 코드 생성 중...',
    'QR Code generation failed': 'QR 코드 생성 실패',
    'Room ID': '방 ID',
    'Enter or paste a Room ID': '방 ID를 입력하거나 붙여넣으세요',
    'Join Sync': '동기화 참가',
    'Leave Sync': '동기화 나가기',
    'Status:': '상태:',
    Connected: '연결됨',
    'Connecting...': '연결 중...',
    Disabled: '비활성화',
    '{count} peer': '{count}명의 피어',
    '{count} peers': '{count}명의 피어',
    'Sharing is active! Other devices can join using the link or QR code above.':
      '공유가 활성화되었습니다! 다른 기기는 위의 링크나 QR 코드를 사용하여 참가할 수 있습니다.',
    'Click "Start Sharing" to generate a sync link that other devices can use to connect.':
      '"공유 시작"을 클릭하여 다른 기기가 연결할 수 있는 동기화 링크를 생성하세요.',
    'Joined a sync session. Your data is syncing with the host.':
      '동기화 세션에 참가했습니다. 데이터가 호스트와 동기화 중입니다.',
    'Enter the Room ID from the host device, or use a sync link directly.':
      '호스트 기기의 방 ID를 입력하거나 동기화 링크를 직접 사용하세요.',
    'Scan QR Code': 'QR 코드 스캔',
    'Scan a QR code to join': 'QR 코드를 스캔하여 참가',
    'Point your camera at a sync QR code': '동기화 QR 코드에 카메라를 맞추세요',
    'Camera access denied': '카메라 접근 거부됨',
    'Unable to access camera. Please grant camera permissions.':
      '카메라에 접근할 수 없습니다. 카메라 권한을 허용해 주세요.',
    'Stop Scanner': '스캐너 중지',
    or: '또는',
  },
}

export function SyncSettings() {
  const { lang, t } = useI18n(localI18n)
  const url = useUrl(lang)
  const navigate = useNavigate()
  const {
    enabled,
    roomId,
    status,
    peerCount,
    mode: savedMode,
    enableSync,
    disableSync,
    generateRoomId,
  } = useSyncStore()

  const [mode, setMode] = useState<SyncMode>(savedMode || 'share')
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

  // Generate QR code when sharing is active
  useEffect(() => {
    if (enabled && roomId && savedMode === 'share') {
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
  }, [enabled, roomId, savedMode])

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

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        const peerText =
          peerCount === 1
            ? t('{count} peer', { count: peerCount })
            : t('{count} peers', { count: peerCount })
        return `${t('Connected')} (${peerText})`
      case 'connecting':
        return t('Connecting...')
      default:
        return t('Disabled')
    }
  }

  // If sync is already enabled, show the active state
  if (enabled && roomId) {
    const isShareMode = savedMode === 'share'

    return (
      <Card className="w-full">
        <CardBody className="gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">{t('Status:')}</span>
              <Chip color={getStatusColor()} size="sm" variant="flat">
                {getStatusText()}
              </Chip>
            </div>
            <Button
              color="danger"
              variant="flat"
              size="sm"
              onPress={handleStopSync}
            >
              {isShareMode ? t('Stop Sharing') : t('Leave Sync')}
            </Button>
          </div>

          {isShareMode && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">{t('Sync Link')}</label>
                <Snippet
                  symbol={false}
                  copyIcon={<Icon name="Copy" className="h-4 w-4" />}
                  tooltipProps={{ content: t('Copy Link') }}
                  classNames={{
                    pre: 'whitespace-pre-wrap break-all max-h-16 overflow-y-hidden',
                  }}
                >
                  {getSyncLink(roomId)}
                </Snippet>
              </div>

              <div className="flex flex-col items-center gap-2">
                <label className="text-sm font-medium">
                  {t('Or scan this QR Code:')}
                </label>
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="Sync QR Code"
                    className="w-48 h-48 rounded-lg border border-default-200"
                  />
                ) : qrCodeError ? (
                  <div className="w-48 h-48 flex items-center justify-center bg-default-100 rounded-lg">
                    <span className="text-xs text-default-400">
                      {t('QR Code generation failed')}
                    </span>
                  </div>
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-default-100 rounded-lg">
                    <span className="text-xs text-default-400">
                      {t('Generating QR Code...')}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-xs text-default-400 bg-default-100 p-3 rounded-lg">
                <p>
                  {t(
                    'Sharing is active! Other devices can join using the link or QR code above.',
                  )}
                </p>
              </div>
            </>
          )}

          {!isShareMode && (
            <div className="text-xs text-default-400 bg-default-100 p-3 rounded-lg">
              <p>
                {t(
                  'Joined a sync session. Your data is syncing with the host.',
                )}
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    )
  }

  // Show Share/Join tabs when not connected
  return (
    <Card className="w-full">
      <CardBody className="gap-4">
        <Tabs
          selectedKey={mode}
          onSelectionChange={(key) => setMode(key as SyncMode)}
          variant="bordered"
          fullWidth
        >
          <Tab
            key="share"
            title={
              <div className="flex items-center gap-2">
                <Icon name="Share" className="h-4 w-4" />
                <span>{t('Share')}</span>
              </div>
            }
          />
          <Tab
            key="join"
            title={
              <div className="flex items-center gap-2">
                <Icon name="UserPlus" className="h-4 w-4" />
                <span>{t('Join')}</span>
              </div>
            }
          />
        </Tabs>

        {mode === 'share' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-default-500">
              {t('Share your data with other devices')}
            </p>
            <Button
              color="primary"
              onPress={handleStartSharing}
              isLoading={isEnabling}
              startContent={
                !isEnabling && <Icon name="Share" className="h-4 w-4" />
              }
            >
              {t('Start Sharing')}
            </Button>
            <div className="text-xs text-default-400 bg-default-100 p-3 rounded-lg">
              <p>
                {t(
                  'Click "Start Sharing" to generate a sync link that other devices can use to connect.',
                )}
              </p>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-default-500">
              {t('Join an existing sync session')}
            </p>

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
              <label className="text-sm font-medium">{t('Room ID')}</label>
              <div className="flex gap-2">
                <Input
                  value={inputRoomId}
                  onValueChange={setInputRoomId}
                  placeholder={t('Enter or paste a Room ID')}
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
                  {t('Join Sync')}
                </Button>
              </div>
            </div>
            <div className="text-xs text-default-400 bg-default-100 p-3 rounded-lg">
              <p>
                {t(
                  'Enter the Room ID from the host device, or use a sync link directly.',
                )}
              </p>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
