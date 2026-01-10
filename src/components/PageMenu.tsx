/**
 * Page Menu Component
 *
 * Fixed top-right menu for global page actions
 */
import { LocalBackupButton } from '@/features/local-backup'

export function PageMenu() {
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-1">
      <LocalBackupButton />
    </div>
  )
}
