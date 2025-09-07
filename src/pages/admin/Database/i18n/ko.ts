import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  'Database exported successfully': '데이터베이스가 성공적으로 내보내졌습니다',
  'Failed to export database': '데이터베이스 내보내기에 실패했습니다',
  'Database imported successfully ({count} items)':
    '데이터베이스가 성공적으로 가져와졌습니다 ({count} 항목)',
  'Failed to import database - invalid file format':
    '데이터베이스 가져오기에 실패했습니다 - 잘못된 파일 형식',
  'Backup database': '데이터베이스 백업',
  'Restore database': '데이터베이스 복원',
} as const
