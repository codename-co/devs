import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  // Sync - General
  'Successfully joined sync room': '동기화 방에 성공적으로 참여했습니다',
  Sync: '동기화',
  Syncing: '동기화 중',
  'Connecting...': '연결 중...',
  Offline: '오프라인',
  Connected: '연결됨',
  Disabled: '비활성화',
  Disconnect: '연결 해제',
  Back: '뒤로',

  // Sync - Modes
  Create: '생성',
  Join: '참가',
  Share: '공유',
  'Start Sync': '동기화 시작',
  'Join Room': '참가',

  // Sync - Instructions
  'Synchronize with devices': '기기와 동기화',
  'Start synchronization': '동기화 시작',
  'Join with a code': '코드로 참가',
  'Create a new sync room': '새 동기화 방 만들기',
  'Join an existing room': '기존 방에 참가',
  'Start sharing with other devices': '다른 기기와 공유 시작',
  'Connect to an existing device with a code': '코드로 기존 기기에 연결',
  'Synchronize with other devices': '다른 기기와 동기화',
  'Join a device': '기기에 참여',
  'Enter the code from another device, or use a sync link.':
    '다른 기기의 코드를 입력하거나 동기화 링크를 사용하세요.',
  'Start syncing and invite others to join':
    '동기화를 시작하고 다른 사람을 초대하세요',
  'All connected devices sync in real-time as equal peers. Any device can read and write data.':
    '연결된 모든 기기는 동등한 피어로 실시간 동기화됩니다. 모든 기기에서 데이터를 읽고 쓸 수 있습니다.',
  'Your data syncs with all peers. Everyone has equal access - changes from any device are shared instantly.':
    '데이터가 모든 피어와 동기화됩니다. 모두가 동등한 접근 권한을 가지며 - 모든 기기의 변경 사항이 즉시 공유됩니다.',
  'Syncing with all connected peers. All devices are equal.':
    '모든 연결된 피어와 동기화 중. 모든 기기는 동등합니다.',
  'Sync active! Share the link or QR code with other devices to connect.':
    '동기화 활성화됨! 다른 기기와 연결하려면 링크나 QR 코드를 공유하세요.',
  'Click "Synchronize with devices" to start syncing.':
    '"기기와 동기화"를 클릭하여 동기화를 시작하세요.',
  'Sync your data across devices in real-time.':
    '기기 간에 실시간으로 데이터를 동기화하세요.',
  'No server needed - data stays between your devices.':
    '서버가 필요 없습니다 - 데이터는 기기 사이에 머뭅니다.',

  // Sync - Room/Code
  Code: '코드',
  'Room Code': '방 코드',
  'Enter room code': '방 코드 입력',
  'Enter or paste a code': '코드를 입력하거나 붙여넣으세요',
  'Sync Link': '동기화 링크',
  'Copy Link': '링크 복사',
  'Copied!': '복사됨!',
  'Share this code or link with other devices:':
    '이 코드나 링크를 다른 기기와 공유하세요:',
  'Copy to clipboard': '클립보드에 복사',
  'Sync Settings': '동기화 설정',

  // Sync - QR Code
  'Or scan this QR Code:': '또는 이 QR 코드를 스캔하세요:',
  'Generating QR Code...': 'QR 코드 생성 중...',
  'QR Code generation failed': 'QR 코드 생성 실패',
  'Scan QR Code': 'QR 코드 스캔',
  'Scan a QR code to join': 'QR 코드를 스캔하여 참가',
  'Scan the QR Code': 'QR 코드 스캔',
  'Stop Scanner': '스캐너 중지',
  'Point your camera at a sync QR code': '동기화 QR 코드에 카메라를 맞추세요',
  'Use another device to scan this QR code to connect instantly.':
    '다른 기기로 이 QR 코드를 스캔하여 즉시 연결하세요.',
  'Camera access denied': '카메라 접근 거부됨',
  'Unable to access camera. Please grant camera permissions.':
    '카메라에 접근할 수 없습니다. 카메라 권한을 허용해 주세요.',

  // Sync - Secret Link
  'Share the secret link': '비밀 링크 공유',
  'Copy and share this unique link with your other device. Keep it private!':
    '이 고유한 링크를 다른 기기와 복사하여 공유하세요. 비공개로 유지하세요!',

  // Sync - Peers
  'Status:': '상태:',
  '{count} peer': '{count}명의 피어',
  '{count} peers': '{count}명의 피어',
  You: '나',
  Peer: '피어',
  Device: '기기',

  // Sync - Activity
  Sent: '전송됨',
  Received: '수신됨',
  'Activity Details': '활동 세부정보',
  'No activity': '활동 없음',
  'Data Activity': '데이터 활동',
  'Network Topology': '네트워크 토폴로지',
  'Total synced': '총 동기화',
  bytes: '바이트',
  KB: 'KB',
  MB: 'MB',
  'just now': '방금',
  ago: '전',
  second: '초',
  seconds: '초',

  // Sync - Privacy
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

  // Sync - Misc
  or: '또는',
  'Local Backup': '로컬 백업',
  'Automatically backup your data to a folder on your device':
    '기기의 폴더에 데이터를 자동으로 백업합니다',
}
