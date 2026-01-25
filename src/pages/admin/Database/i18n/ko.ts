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
  Edit: '수정',
  Save: '저장',
  Cancel: '취소',
  'Field updated': '필드가 업데이트되었습니다',
  'Failed to update field': '필드 업데이트에 실패했습니다',
  'Invalid number value': '잘못된 숫자 값',
  'Invalid date value': '잘못된 날짜 값',
  'Invalid JSON value': '잘못된 JSON 값',
  'Clear Collection': '컬렉션 비우기',
  'Collection cleared successfully ({count} records removed)':
    '컬렉션이 성공적으로 비워졌습니다 ({count}개 레코드 삭제됨)',
  'Failed to clear collection': '컬렉션 비우기에 실패했습니다',
  'Are you sure you want to clear the "{store}" collection? This will permanently delete all {count} records.':
    '정말로 "{store}" 컬렉션을 비우시겠습니까? 모든 {count}개의 레코드가 영구적으로 삭제됩니다.',
  'This action cannot be undone.': '이 작업은 되돌릴 수 없습니다.',
  'Clear All Records': '모든 레코드 삭제',
} as const
