import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  'Knowledge Base': '지식 베이스',
  'Upload files and synchronize local folders to build your knowledge base':
    '파일을 업로드하고 로컬 폴더를 동기화하여 지식 베이스를 구축하세요',
  'Add knowledge': '지식 추가',
  'Uploading files…': '파일 업로드 중…',
  'Drag & drop files here, or click to select':
    '여기에 파일을 드래그하거나 클릭하여 선택하세요',
  'Pick files': '파일 선택',
  'Sync a folder': '폴더 동기화',
  'Synced folders': '동기화된 폴더',
  'Last sync: {time}': '마지막 동기화: {time}',
  Disconnected: '연결 해제됨',
  'Stop syncing': '동기화 중단',
  Reconnect: '다시 연결',
  'My Knowledge': '내 지식',
  'No knowledge items yet. Upload some files to get started!':
    '아직 지식 항목이 없습니다. 파일을 업로드하여 시작하세요!',
  'Knowledge Item': '지식 항목',
} as const
