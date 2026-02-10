/**
 * Sync Password Modal
 *
 * Fullscreen, non-dismissable modal that requires a password before
 * joining an encrypted P2P sync room.  Shown in two scenarios:
 *
 * 1. **Join via URL** — a `?join=<roomId>` link was opened.
 * 2. **Reconnect** — a previous session exists but the password is not
 *    persisted, so the user must re-enter it.
 *
 * The modal cannot be closed or dismissed — the user must either enter
 * the correct password or explicitly cancel (which aborts the join).
 */
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from '@heroui/react'
import { useState, useCallback } from 'react'

import { useSyncStore } from '../stores/syncStore'
import { Icon } from '@/components/Icon'
import { useI18n } from '@/i18n'

export function SyncPasswordModal() {
  const { t } = useI18n()

  const pendingJoinRoomId = useSyncStore((s) => s.pendingJoinRoomId)
  const needsPasswordReentry = useSyncStore((s) => s.needsPasswordReentry)
  const roomId = useSyncStore((s) => s.roomId)
  const enableSync = useSyncStore((s) => s.enableSync)
  const disableSync = useSyncStore((s) => s.disableSync)
  const setPendingJoinRoomId = useSyncStore((s) => s.setPendingJoinRoomId)
  const clearPasswordReentry = useSyncStore((s) => s.clearPasswordReentry)

  const [password, setPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine which scenario we're in
  const isJoining = !!pendingJoinRoomId
  const isReconnecting = !isJoining && needsPasswordReentry
  const isOpen = isJoining || isReconnecting

  const effectiveRoomId = pendingJoinRoomId ?? roomId

  const handleSubmit = useCallback(async () => {
    if (!password.trim() || !effectiveRoomId) return

    setIsLoading(true)
    setError(null)

    try {
      const mode = isJoining ? 'join' : 'share'
      await enableSync(effectiveRoomId, password.trim(), mode)
    } catch (err) {
      console.error('[SyncPasswordModal] Failed to connect:', err)
      setError(t('Failed to connect. Please check your password and try again.'))
    } finally {
      setIsLoading(false)
    }
  }, [password, effectiveRoomId, isJoining, enableSync, t])

  const handleCancel = useCallback(() => {
    setPassword('')
    setError(null)
    setIsPasswordVisible(false)

    if (isJoining) {
      // Cancel the join — just clear the pending room
      setPendingJoinRoomId(null)
    } else if (isReconnecting) {
      // Cancel reconnect — fully disable sync
      clearPasswordReentry()
      disableSync()
    }
  }, [isJoining, isReconnecting, setPendingJoinRoomId, clearPasswordReentry, disableSync])

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      isDismissable={false}
      isKeyboardDismissDisabled
      hideCloseButton
      size="md"
      backdrop="blur"
      classNames={{
        backdrop: 'bg-black/80',
        wrapper: 'z-[9999]',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Icon name="Lock" className="h-5 w-5 text-warning" />
            <span>
              {isJoining
                ? t('Enter Sync Password')
                : t('Reconnect to Sync Room')}
            </span>
          </div>
        </ModalHeader>

        <ModalBody>
          <p className="text-sm text-default-500">
            {isJoining
              ? t(
                  'This sync room is encrypted. Enter the password set by the room creator to join.',
                )
              : t(
                  'Your previous sync session requires the room password to reconnect. Enter your password to resume syncing.',
                )}
          </p>

          <Input
            autoFocus
            value={password}
            onValueChange={(v) => {
              setPassword(v)
              setError(null)
            }}
            placeholder={t('Enter the room password')}
            type={isPasswordVisible ? 'text' : 'password'}
            isInvalid={!!error}
            errorMessage={error}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && password.trim()) handleSubmit()
            }}
            startContent={
              <Icon
                name="Lock"
                className="h-4 w-4 text-default-400 pointer-events-none"
              />
            }
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
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={handleCancel} isDisabled={isLoading}>
            {isJoining ? t('Cancel') : t('Disconnect')}
          </Button>
          <Button
            color="primary"
            onPress={handleSubmit}
            isLoading={isLoading}
            isDisabled={!password.trim()}
          >
            {isJoining ? t('Join Room') : t('Reconnect')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
