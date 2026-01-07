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
  Radio,
  RadioGroup,
  RadioProps,
  Snippet,
} from '@heroui/react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { useSyncStore } from '../stores/syncStore'
import { generateSetupQRCode } from '@/lib/qr-code'
import { Icon } from '@/components/Icon'
import { SyncActivityDetails } from './SyncActivityDetails'
import { PeerNetworkGraph } from './PeerNetworkGraph'
import { useI18n, useUrl } from '@/i18n'
import { cn } from '@/lib/utils'

const localI18n = {
  en: [
    'Create',
    'Join',
    'Disconnect',
    'Synchronize with devices',
    'Start synchronization',
    'Join with a code',
    'Sync Link',
    'Copy Link',
    'Copied!',
    'Or scan this QR Code:',
    'Generating QR Code...',
    'QR Code generation failed',
    'Code',
    'Enter or paste a code',
    'Status:',
    'Connected',
    'Connecting...',
    'Disabled',
    '{count} peer',
    '{count} peers',
    'Sync active! Share the link or QR code with other devices to connect.',
    'Click "Synchronize with devices" to start syncing.',
    'Syncing with all connected peers. All devices are equal.',
    'Scan the QR Code',
    'Use another device to scan this QR code to connect instantly.',
    'Share the secret link',
    'Copy and share this unique link with your other device. Keep it private!',
    'Enter the code from another device, or use a sync link.',
    'Start syncing and invite others to join',
    'All connected devices sync in real-time as equal peers. Any device can read and write data.',
    'Join with a sync code',
    'Your data syncs with all peers. Everyone has equal access - changes from any device are shared instantly.',
    'Scan QR Code',
    'Scan a QR code to join',
    'Point your camera at a sync QR code',
    'Camera access denied',
    'Unable to access camera. Please grant camera permissions.',
    'Stop Scanner',
    'or',
    'Sent',
    'Received',
    'Activity Details',
    'Your Data Stays Local',
    'Everything runs in your browser. Your conversations, agents, and data are stored locally on your device and never sent to any server.',
    'Complete Privacy',
    'No accounts, no tracking, no cloud storage. You own your data.',
    'Work Offline',
    'Use the app without an internet connection. Your data is always available.',
    'Want to sync across devices?',
    'Enable peer-to-peer sync to share data between your devices or with others. Data travels directly between devices.',
    'Share',
    'Start sharing with other devices',
    'Connect to an existing device with a code',
    'Synchronize with other devices',
    'Join a device',
    'Back',
    'You',
    'Peer',
    'No activity',
  ] as const,
  fr: {
    Create: 'Créer',
    Join: 'Rejoindre',
    Disconnect: 'Déconnecter',
    'Synchronize with devices': 'Synchroniser avec les appareils',
    'Start synchronization': 'Démarrer la synchronisation',
    'Join with a code': 'Rejoindre avec un code',
    'Sync Link': 'Lien de synchronisation',
    'Copy Link': 'Copier le lien',
    'Copied!': 'Copié !',
    'Or scan this QR Code:': 'Ou scannez ce QR Code :',
    'Generating QR Code...': 'Génération du QR Code...',
    'QR Code generation failed': 'Échec de la génération du QR Code',
    Code: 'Code',
    'Enter or paste a code': 'Entrez ou collez un code',
    'Status:': 'Statut :',
    Connected: 'Connecté',
    'Connecting...': 'Connexion...',
    Disabled: 'Désactivé',
    '{count} peer': '{count} pair',
    '{count} peers': '{count} pairs',
    'Sync active! Share the link or QR code with other devices to connect.':
      "Synchronisation active ! Partagez le lien ou le QR code pour connecter d'autres appareils.",
    'Click "Synchronize with devices" to start syncing.':
      'Cliquez sur "Synchroniser avec les appareils" pour démarrer la synchronisation.',
    'Syncing with all connected peers. All devices are equal.':
      'Synchronisation avec tous les pairs connectés. Tous les appareils sont égaux.',
    'Scan the QR Code': 'Scannez le QR Code',
    'Use another device to scan this QR code to connect instantly.':
      'Utilisez un autre appareil pour scanner ce QR code et vous connecter instantanément.',
    'Share the secret link': 'Partagez le lien secret',
    'Copy and share this unique link with your other device. Keep it private!':
      'Copiez et partagez ce lien unique avec votre autre appareil. Gardez-le privé !',
    'Enter the code from another device, or use a sync link.':
      "Entrez le code d'un autre appareil, ou utilisez un lien de synchronisation.",
    'Start syncing and invite others to join':
      "Démarrez la synchronisation et invitez d'autres à rejoindre",
    'All connected devices sync in real-time as equal peers. Any device can read and write data.':
      'Tous les appareils connectés se synchronisent en temps réel en tant que pairs égaux. Tout appareil peut lire et écrire des données.',
    'Your data syncs with all peers. Everyone has equal access - changes from any device are shared instantly.':
      "Vos données se synchronisent avec tous les pairs. Tout le monde a un accès égal - les modifications de n'importe quel appareil sont partagées instantanément.",
    'Scan QR Code': 'Scanner un QR Code',
    'Scan a QR code to join': 'Scannez un QR code pour rejoindre',
    'Point your camera at a sync QR code':
      'Pointez votre caméra vers un QR code de synchronisation',
    'Camera access denied': 'Accès à la caméra refusé',
    'Unable to access camera. Please grant camera permissions.':
      "Impossible d'accéder à la caméra. Veuillez autoriser l'accès à la caméra.",
    'Stop Scanner': 'Arrêter le scanner',
    or: 'ou',
    Sent: 'Envoyé',
    Received: 'Reçu',
    'Activity Details': "Détails de l'activité",
    Sync: 'Synchronisation',
    'Your Data Stays Local': 'Vos données restent locales',
    'Everything runs in your browser. Your conversations, agents, and data are stored locally on your device and never sent to any server.':
      'Tout fonctionne dans votre navigateur. Vos conversations, agents et données sont stockés localement sur votre appareil et jamais envoyés à aucun serveur.',
    'Complete Privacy': 'Confidentialité totale',
    'No accounts, no tracking, no cloud storage. You own your data.':
      'Pas de compte, pas de suivi, pas de stockage cloud. Vos données vous appartiennent.',
    'Work Offline': 'Travailler hors ligne',
    'Use the app without an internet connection. Your data is always available.':
      "Utilisez l'application sans connexion internet. Vos données sont toujours disponibles.",
    'Want to sync across devices?': 'Envie de synchroniser entre appareils ?',
    'Enable peer-to-peer sync to share data between your devices or with others. Data travels directly between devices.':
      "Activez la synchronisation pair-à-pair pour partager des données entre vos appareils ou avec d'autres personnes. Les données transitent directement entre appareils.",
    Share: 'Partager à un autre appareil',
    'Start sharing with other devices':
      "Commencez à partager avec d'autres appareils",
    'Connect to an existing device with a code':
      'Connectez-vous à un appareil existant avec un code',
    'Synchronize with other devices': "Synchroniser avec d'autres appareils",
    'Join a device': 'Rejoindre un appareil',
    Back: 'Retour',
    You: 'Vous',
    Peer: 'Pair',
    'No activity': 'Aucune activité',
  },
  es: {
    Create: 'Crear',
    Join: 'Unirse',
    Disconnect: 'Desconectar',
    'Synchronize with devices': 'Sincronizar con dispositivos',
    'Start synchronization': 'Iniciar sincronización',
    'Join with a code': 'Unirse con un código',
    'Sync Link': 'Enlace de sincronización',
    'Copy Link': 'Copiar enlace',
    'Copied!': '¡Copiado!',
    'Or scan this QR Code:': 'O escanea este código QR:',
    'Generating QR Code...': 'Generando código QR...',
    'QR Code generation failed': 'Error al generar el código QR',
    Code: 'Código',
    'Enter or paste a code': 'Ingresa o pega un código',
    'Status:': 'Estado:',
    Connected: 'Conectado',
    'Connecting...': 'Conectando...',
    Disabled: 'Deshabilitado',
    '{count} peer': '{count} par',
    '{count} peers': '{count} pares',
    'Sync active! Share the link or QR code with other devices to connect.':
      '¡Sincronización activa! Comparte el enlace o código QR con otros dispositivos.',
    'Click "Synchronize with devices" to start syncing.':
      'Haz clic en "Sincronizar con dispositivos" para iniciar la sincronización.',
    'Syncing with all connected peers. All devices are equal.':
      'Sincronizando con todos los pares conectados. Todos los dispositivos son iguales.',
    'Scan the QR Code': 'Escanea el código QR',
    'Use another device to scan this QR code to connect instantly.':
      'Usa otro dispositivo para escanear este código QR y conectarte al instante.',
    'Share the secret link': 'Comparte el enlace secreto',
    'Copy and share this unique link with your other device. Keep it private!':
      '¡Copia y comparte este enlace único con tu otro dispositivo. Mantenlo privado!',
    'Enter the code from another device, or use a sync link.':
      'Ingresa el código de otro dispositivo o usa un enlace de sincronización.',
    'Start syncing and invite others to join':
      'Inicia la sincronización e invita a otros a unirse',
    'All connected devices sync in real-time as equal peers. Any device can read and write data.':
      'Todos los dispositivos conectados se sincronizan en tiempo real como pares iguales. Cualquier dispositivo puede leer y escribir datos.',
    'Your data syncs with all peers. Everyone has equal access - changes from any device are shared instantly.':
      'Tus datos se sincronizan con todos los pares. Todos tienen acceso igual - los cambios de cualquier dispositivo se comparten instantáneamente.',
    'Scan QR Code': 'Escanear código QR',
    'Scan a QR code to join': 'Escanea un código QR para unirte',
    'Point your camera at a sync QR code':
      'Apunta tu cámara a un código QR de sincronización',
    'Camera access denied': 'Acceso a la cámara denegado',
    'Unable to access camera. Please grant camera permissions.':
      'No se puede acceder a la cámara. Por favor, otorga permisos de cámara.',
    'Stop Scanner': 'Detener escáner',
    or: 'o',
    Sent: 'Enviado',
    Received: 'Recibido',
    'Activity Details': 'Detalles de actividad',
    Sync: 'Sincronización',
    'Your Data Stays Local': 'Tus datos se quedan locales',
    'Everything runs in your browser. Your conversations, agents, and data are stored locally on your device and never sent to any server.':
      'Todo funciona en tu navegador. Tus conversaciones, agentes y datos se almacenan localmente en tu dispositivo y nunca se envían a ningún servidor.',
    'Complete Privacy': 'Privacidad completa',
    'No accounts, no tracking, no cloud storage. You own your data.':
      'Sin cuentas, sin seguimiento, sin almacenamiento en la nube. Tus datos son tuyos.',
    'Work Offline': 'Trabaja sin conexión',
    'Use the app without an internet connection. Your data is always available.':
      'Usa la aplicación sin conexión a internet. Tus datos siempre están disponibles.',
    'Want to sync across devices?': '¿Quieres sincronizar entre dispositivos?',
    'Enable peer-to-peer sync to share data between your devices or with others. Data travels directly between devices.':
      'Activa la sincronización entre pares para compartir datos entre tus dispositivos o con otros. Los datos viajan directamente entre dispositivos.',
    Share: 'Compartir',
    'Start sharing with other devices':
      'Comienza a compartir con otros dispositivos',
    'Connect to an existing device with a code':
      'Conéctate a un dispositivo existente con un código',
    'Synchronize with other devices': 'Sincronizar con otros dispositivos',
    'Join a device': 'Unirse a un dispositivo',
    Back: 'Volver',
    You: 'Tú',
    Peer: 'Par',
    'No activity': 'Sin actividad',
  },
  de: {
    Create: 'Erstellen',
    Join: 'Beitreten',
    Disconnect: 'Trennen',
    'Synchronize with devices': 'Mit Geräten synchronisieren',
    'Start synchronization': 'Synchronisation starten',
    'Join with a code': 'Mit einem Code beitreten',
    'Sync Link': 'Sync-Link',
    'Copy Link': 'Link kopieren',
    'Copied!': 'Kopiert!',
    'Or scan this QR Code:': 'Oder scannen Sie diesen QR-Code:',
    'Generating QR Code...': 'QR-Code wird generiert...',
    'QR Code generation failed': 'QR-Code-Generierung fehlgeschlagen',
    Code: 'Code',
    'Enter or paste a code': 'Geben Sie einen Code ein oder fügen Sie ihn ein',
    'Status:': 'Status:',
    Connected: 'Verbunden',
    'Connecting...': 'Verbinden...',
    Disabled: 'Deaktiviert',
    '{count} peer': '{count} Peer',
    '{count} peers': '{count} Peers',
    'Your Data Stays Local': 'Ihre Daten bleiben lokal',
    'Everything runs in your browser. Your conversations, agents, and data are stored locally on your device and never sent to any server.':
      'Alles läuft in Ihrem Browser. Ihre Gespräche, Agenten und Daten werden lokal auf Ihrem Gerät gespeichert und niemals an einen Server gesendet.',
    'Complete Privacy': 'Vollständige Privatsphäre',
    'No accounts, no tracking, no cloud storage. You own your data.':
      'Keine Konten, kein Tracking, kein Cloud-Speicher. Ihre Daten gehören Ihnen.',
    'Work Offline': 'Offline arbeiten',
    'Use the app without an internet connection. Your data is always available.':
      'Nutzen Sie die App ohne Internetverbindung. Ihre Daten sind immer verfügbar.',
    'Want to sync across devices?':
      'Möchten Sie zwischen Geräten synchronisieren?',
    'Enable peer-to-peer sync to share data between your devices or with others. Data travels directly between devices.':
      'Aktivieren Sie die Peer-to-Peer-Synchronisierung, um Daten zwischen Ihren Geräten oder mit anderen zu teilen. Daten werden direkt zwischen den Geräten übertragen.',
    Share: 'Teilen',
    'Start sharing with other devices':
      'Beginnen Sie mit dem Teilen mit anderen Geräten',
    'Connect to an existing device with a code':
      'Mit einem bestehenden Gerät über einen Code verbinden',
    'Synchronize with other devices': 'Mit anderen Geräten synchronisieren',
    'Join a device': 'Einem Gerät beitreten',
    Back: 'Zurück',
    You: 'Sie',
    Peer: 'Peer',
    'No activity': 'Keine Aktivität',
    'Sync active! Share the link or QR code with other devices to connect.':
      'Sync aktiv! Teilen Sie den Link oder QR-Code mit anderen Geräten.',
    'Click "Synchronize with devices" to start syncing.':
      'Klicken Sie auf "Mit Geräten synchronisieren", um die Synchronisierung zu starten.',
    'Syncing with all connected peers. All devices are equal.':
      'Synchronisierung mit allen verbundenen Peers. Alle Geräte sind gleichberechtigt.',
    'Scan the QR Code': 'QR-Code scannen',
    'Use another device to scan this QR code to connect instantly.':
      'Verwenden Sie ein anderes Gerät, um diesen QR-Code zu scannen und sich sofort zu verbinden.',
    'Share the secret link': 'Geheimen Link teilen',
    'Copy and share this unique link with your other device. Keep it private!':
      'Kopieren und teilen Sie diesen einzigartigen Link mit Ihrem anderen Gerät. Halten Sie ihn geheim!',
    'Enter the code from another device, or use a sync link.':
      'Geben Sie den Code von einem anderen Gerät ein oder verwenden Sie einen Sync-Link.',
    'Start syncing and invite others to join':
      'Starten Sie die Synchronisierung und laden Sie andere ein',
    'All connected devices sync in real-time as equal peers. Any device can read and write data.':
      'Alle verbundenen Geräte synchronisieren in Echtzeit als gleichberechtigte Peers. Jedes Gerät kann Daten lesen und schreiben.',
    'Your data syncs with all peers. Everyone has equal access - changes from any device are shared instantly.':
      'Ihre Daten synchronisieren sich mit allen Peers. Alle haben gleichen Zugriff - Änderungen von jedem Gerät werden sofort geteilt.',
    'Scan QR Code': 'QR-Code scannen',
    'Scan a QR code to join': 'Scannen Sie einen QR-Code zum Beitreten',
    'Point your camera at a sync QR code':
      'Richten Sie Ihre Kamera auf einen Sync-QR-Code',
    'Camera access denied': 'Kamerazugriff verweigert',
    'Unable to access camera. Please grant camera permissions.':
      'Kamera nicht zugänglich. Bitte erteilen Sie Kameraberechtigungen.',
    'Stop Scanner': 'Scanner stoppen',
    or: 'oder',
    Sent: 'Gesendet',
    Received: 'Empfangen',
    'Activity Details': 'Aktivitätsdetails',
    Sync: 'Synchronisierung',
  },
  ar: {
    Create: 'إنشاء',
    Join: 'انضمام',
    Disconnect: 'قطع الاتصال',
    'Synchronize with devices': 'مزامنة مع الأجهزة',
    'Start synchronization': 'بدء المزامنة',
    'Join with a code': 'الانضمام برمز',
    'Sync Link': 'رابط المزامنة',
    'Copy Link': 'نسخ الرابط',
    'Copied!': 'تم النسخ!',
    'Or scan this QR Code:': 'أو امسح رمز QR:',
    'Generating QR Code...': 'جاري إنشاء رمز QR...',
    'QR Code generation failed': 'فشل إنشاء رمز QR',
    Code: 'الرمز',
    'Enter or paste a code': 'أدخل أو الصق رمزًا',
    'Status:': 'الحالة:',
    Connected: 'متصل',
    'Connecting...': 'جاري الاتصال...',
    Disabled: 'معطل',
    '{count} peer': '{count} نظير',
    '{count} peers': '{count} نظراء',
    'Sync active! Share the link or QR code with other devices to connect.':
      'المزامنة نشطة! شارك الرابط أو رمز QR مع الأجهزة الأخرى.',
    'Click "Synchronize with devices" to start syncing.':
      'انقر على "مزامنة مع الأجهزة" لبدء المزامنة.',
    'Syncing with all connected peers. All devices are equal.':
      'مزامنة مع جميع النظراء المتصلين. جميع الأجهزة متساوية.',
    'Scan the QR Code': 'امسح رمز QR',
    'Use another device to scan this QR code to connect instantly.':
      'استخدم جهازًا آخر لمسح رمز QR هذا للاتصال فورًا.',
    'Share the secret link': 'شارك الرابط السري',
    'Copy and share this unique link with your other device. Keep it private!':
      'انسخ وشارك هذا الرابط الفريد مع جهازك الآخر. احتفظ به خاصًا!',
    'Enter the code from another device, or use a sync link.':
      'أدخل الرمز من جهاز آخر، أو استخدم رابط مزامنة.',
    'Start syncing and invite others to join':
      'ابدأ المزامنة وادعُ الآخرين للانضمام',
    'All connected devices sync in real-time as equal peers. Any device can read and write data.':
      'جميع الأجهزة المتصلة تتزامن في الوقت الفعلي كنظراء متساوين. أي جهاز يمكنه قراءة وكتابة البيانات.',
    'Your data syncs with all peers. Everyone has equal access - changes from any device are shared instantly.':
      'بياناتك تتزامن مع جميع النظراء. الجميع لديه وصول متساوٍ - التغييرات من أي جهاز تتم مشاركتها فورًا.',
    'Scan QR Code': 'مسح رمز QR',
    'Scan a QR code to join': 'امسح رمز QR للانضمام',
    'Point your camera at a sync QR code': 'وجّه الكاميرا نحو رمز QR للمزامنة',
    'Camera access denied': 'تم رفض الوصول إلى الكاميرا',
    'Unable to access camera. Please grant camera permissions.':
      'تعذر الوصول إلى الكاميرا. يرجى منح أذونات الكاميرا.',
    'Stop Scanner': 'إيقاف الماسح',
    or: 'أو',
    Sent: 'مُرسَل',
    Received: 'مُستلَم',
    'Activity Details': 'تفاصيل النشاط',
    Sync: 'مزامنة',
    'Your Data Stays Local': 'بياناتك تبقى محلية',
    'Everything runs in your browser. Your conversations, agents, and data are stored locally on your device and never sent to any server.':
      'كل شيء يعمل في متصفحك. محادثاتك ووكلاؤك وبياناتك مخزنة محلياً على جهازك ولا تُرسل أبداً إلى أي خادم.',
    'Complete Privacy': 'خصوصية كاملة',
    'No accounts, no tracking, no cloud storage. You own your data.':
      'لا حسابات، لا تتبع، لا تخزين سحابي. بياناتك ملكك.',
    'Work Offline': 'اعمل بدون اتصال',
    'Use the app without an internet connection. Your data is always available.':
      'استخدم التطبيق بدون اتصال بالإنترنت. بياناتك متاحة دائماً.',
    'Want to sync across devices?': 'تريد المزامنة بين الأجهزة؟',
    'Enable peer-to-peer sync to share data between your devices or with others. Data travels directly between devices.':
      'فعّل المزامنة من نظير إلى نظير لمشاركة البيانات بين أجهزتك أو مع الآخرين. البيانات تنتقل مباشرة بين الأجهزة.',
    Share: 'مشاركة',
    'Start sharing with other devices': 'ابدأ المشاركة مع أجهزة أخرى',
    'Connect to an existing device with a code':
      'اتصل بجهاز موجود باستخدام رمز',
    'Synchronize with other devices': 'مزامنة مع أجهزة أخرى',
    'Join a device': 'انضم إلى جهاز',
    Back: 'رجوع',
    You: 'أنت',
    Peer: 'نظير',
    'No activity': 'لا يوجد نشاط',
  },
  ko: {
    Create: '생성',
    Join: '참가',
    Disconnect: '연결 해제',
    'Synchronize with devices': '기기와 동기화',
    'Start synchronization': '동기화 시작',
    'Join with a code': '코드로 참가',
    'Sync Link': '동기화 링크',
    'Copy Link': '링크 복사',
    'Copied!': '복사됨!',
    'Or scan this QR Code:': '또는 이 QR 코드를 스캔하세요:',
    'Generating QR Code...': 'QR 코드 생성 중...',
    'QR Code generation failed': 'QR 코드 생성 실패',
    Code: '코드',
    'Enter or paste a code': '코드를 입력하거나 붙여넣으세요',
    'Status:': '상태:',
    Connected: '연결됨',
    'Connecting...': '연결 중...',
    Disabled: '비활성화',
    '{count} peer': '{count}명의 피어',
    '{count} peers': '{count}명의 피어',
    'Sync active! Share the link or QR code with other devices to connect.':
      '동기화 활성화됨! 다른 기기와 연결하려면 링크나 QR 코드를 공유하세요.',
    'Click "Synchronize with devices" to start syncing.':
      '"기기와 동기화"를 클릭하여 동기화를 시작하세요.',
    'Syncing with all connected peers. All devices are equal.':
      '모든 연결된 피어와 동기화 중. 모든 기기는 동등합니다.',
    'Scan the QR Code': 'QR 코드 스캔',
    'Use another device to scan this QR code to connect instantly.':
      '다른 기기로 이 QR 코드를 스캔하여 즉시 연결하세요.',
    'Share the secret link': '비밀 링크 공유',
    'Copy and share this unique link with your other device. Keep it private!':
      '이 고유한 링크를 다른 기기와 복사하여 공유하세요. 비공개로 유지하세요!',
    'Enter the code from another device, or use a sync link.':
      '다른 기기의 코드를 입력하거나 동기화 링크를 사용하세요.',
    'Start syncing and invite others to join':
      '동기화를 시작하고 다른 사람을 초대하세요',
    'All connected devices sync in real-time as equal peers. Any device can read and write data.':
      '연결된 모든 기기는 동등한 피어로 실시간 동기화됩니다. 모든 기기에서 데이터를 읽고 쓸 수 있습니다.',
    'Your data syncs with all peers. Everyone has equal access - changes from any device are shared instantly.':
      '데이터가 모든 피어와 동기화됩니다. 모두가 동등한 접근 권한을 가지며 - 모든 기기의 변경 사항이 즉시 공유됩니다.',
    'Scan QR Code': 'QR 코드 스캔',
    'Scan a QR code to join': 'QR 코드를 스캔하여 참가',
    'Point your camera at a sync QR code': '동기화 QR 코드에 카메라를 맞추세요',
    'Camera access denied': '카메라 접근 거부됨',
    'Unable to access camera. Please grant camera permissions.':
      '카메라에 접근할 수 없습니다. 카메라 권한을 허용해 주세요.',
    'Stop Scanner': '스캐너 중지',
    or: '또는',
    Sent: '전송됨',
    Received: '수신됨',
    'Activity Details': '활동 세부정보',
    Sync: '동기화',
    'Your Data Stays Local': '데이터는 로컬에 유지됩니다',
    'Everything runs in your browser. Your conversations, agents, and data are stored locally on your device and never sent to any server.':
      '모든 것이 브라우저에서 실행됩니다. 대화, 에이전트, 데이터는 기기에 로컬로 저장되며 어떤 서버로도 전송되지 않습니다.',
    'Complete Privacy': '완벽한 개인정보 보호',
    'No accounts, no tracking, no cloud storage. You own your data.':
      '계정 없음, 추적 없음, 클라우드 저장소 없음. 데이터는 당신의 것입니다.',
    'Work Offline': '오프라인 작업',
    'Use the app without an internet connection. Your data is always available.':
      '인터넷 연결 없이 앱을 사용하세요. 데이터는 항상 사용 가능합니다.',
    'Want to sync across devices?': '기기 간 동기화를 원하시나요?',
    'Enable peer-to-peer sync to share data between your devices or with others. Data travels directly between devices.':
      '피어 투 피어 동기화를 활성화하여 기기 간 또는 다른 사람과 데이터를 공유하세요. 데이터는 기기 간에 직접 전송됩니다.',
    Share: '공유',
    'Start sharing with other devices': '다른 기기와 공유 시작',
    'Connect to an existing device with a code': '코드로 기존 기기에 연결',
    'Synchronize with other devices': '다른 기기와 동기화',
    'Join a device': '기기에 참여',
    Back: '뒤로',
    You: '나',
    Peer: '피어',
    'No activity': '활동 없음',
  },
}

export const CustomRadio = (props: RadioProps) => {
  const { children, ...otherProps } = props

  return (
    <Radio
      {...otherProps}
      classNames={{
        base: cn(
          'flex m-0 bg-content1 items-center justify-between',
          'flex-row-reverse cursor-pointer rounded-lg gap-4 p-4 border-2 border-transparent',
          'data-[selected=true]:border-primary',
          'w-full max-w-none',
        ),
      }}
    >
      {children}
    </Radio>
  )
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
