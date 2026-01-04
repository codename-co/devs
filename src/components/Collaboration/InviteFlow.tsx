import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Select,
  SelectItem,
  Input,
  Card,
  CardBody,
} from '@heroui/react'
import { motion, AnimatePresence } from 'framer-motion'
import QRCode from 'react-qr-code'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { successToast, errorToast } from '@/lib/toast'

// ============================================================================
// Types
// ============================================================================

type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'

type InviteMethod = 'link' | 'qr' | 'email'

type Step = 'choose-method' | 'link' | 'qr' | 'email'

export interface InviteFlowProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  workspaceName: string
  inviterName: string
  onGenerateLink: (
    role: WorkspaceRole,
  ) => Promise<{ link: string; token: string; expiresAt?: Date }>
  onSendEmailInvite?: (email: string, role: WorkspaceRole) => Promise<void>
  defaultRole?: WorkspaceRole
}

// ============================================================================
// Constants
// ============================================================================

const ROLES: { value: WorkspaceRole; label: string; description: string }[] = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Can manage members and settings',
  },
  {
    value: 'member',
    label: 'Member',
    description: 'Can create and edit content',
  },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
]

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
  }),
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatExpirationDate(date: Date): string {
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Less than 1 hour'
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''}`
  return date.toLocaleDateString()
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ============================================================================
// Sub-components
// ============================================================================

interface MethodCardProps {
  icon: 'Link' | 'QrCode' | 'Mail'
  title: string
  description: string
  isDisabled?: boolean
  onPress: () => void
}

function MethodCard({
  icon,
  title,
  description,
  isDisabled,
  onPress,
}: MethodCardProps) {
  return (
    <Card
      isPressable={!isDisabled}
      isDisabled={isDisabled}
      onPress={onPress}
      className="transition-all hover:scale-[1.02] hover:shadow-lg"
      classNames={{
        base: isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      }}
    >
      <CardBody className="flex flex-col items-center gap-3 p-6">
        <div className="rounded-full bg-primary/10 p-4">
          <Icon name={icon} size="xl" className="text-primary" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-sm text-default-500">{description}</p>
        </div>
      </CardBody>
    </Card>
  )
}

interface StepIndicatorProps {
  currentStep: Step
}

function StepIndicator({ currentStep }: StepIndicatorProps) {
  const isMethodStep = currentStep === 'choose-method'

  return (
    <div className="flex items-center justify-center gap-2">
      <div
        className={`h-2 w-2 rounded-full transition-colors ${
          isMethodStep ? 'bg-primary' : 'bg-default-300'
        }`}
        aria-label="Step 1"
      />
      <div
        className={`h-2 w-2 rounded-full transition-colors ${
          !isMethodStep ? 'bg-primary' : 'bg-default-300'
        }`}
        aria-label="Step 2"
      />
    </div>
  )
}

// ============================================================================
// Step Components
// ============================================================================

interface ChooseMethodStepProps {
  role: WorkspaceRole
  onRoleChange: (role: WorkspaceRole) => void
  onMethodSelect: (method: InviteMethod) => void
  isEmailEnabled: boolean
}

function ChooseMethodStep({
  role,
  onRoleChange,
  onMethodSelect,
  isEmailEnabled,
}: ChooseMethodStepProps) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-6">
      <Select
        label={t('Invite as')}
        selectedKeys={[role]}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as WorkspaceRole
          if (selected) onRoleChange(selected)
        }}
        aria-label="Select role for invitee"
      >
        {ROLES.map((r) => (
          <SelectItem key={r.value} textValue={r.label}>
            <div className="flex flex-col">
              <span className="font-medium">{r.label}</span>
              <span className="text-xs text-default-500">{r.description}</span>
            </div>
          </SelectItem>
        ))}
      </Select>

      <div className="grid gap-4 sm:grid-cols-3">
        <MethodCard
          icon="Link"
          title={t('Share Link')}
          description={t('Share invite link')}
          onPress={() => onMethodSelect('link')}
        />
        <MethodCard
          icon="QrCode"
          title={t('QR Code')}
          description={t('Scan QR code')}
          onPress={() => onMethodSelect('qr')}
        />
        <MethodCard
          icon="Mail"
          title={t('Email')}
          description={t('Send email invite')}
          isDisabled={!isEmailEnabled}
          onPress={() => onMethodSelect('email')}
        />
      </div>
    </div>
  )
}

interface LinkStepProps {
  inviteLink: string
  expiresAt?: Date
  onBack: () => void
}

function LinkStep({ inviteLink, expiresAt, onBack }: LinkStepProps) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      successToast(t('Link copied!'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      errorToast(t('Failed to copy link'))
    }
  }, [inviteLink, t])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Input
          ref={inputRef}
          readOnly
          value={inviteLink}
          label={t('Invite Link')}
          aria-label="Invite link"
          classNames={{
            input: 'cursor-text select-all',
          }}
        />
        {expiresAt && (
          <p className="text-sm text-default-500">
            {t('Expires in')} {formatExpirationDate(expiresAt)}
          </p>
        )}
      </div>

      <Button
        size="lg"
        color="primary"
        className="w-full"
        startContent={<Icon name={copied ? 'Check' : 'Copy'} size="sm" />}
        onPress={handleCopy}
        aria-live="polite"
      >
        {copied ? t('Link Copied!') : t('Copy Link')}
      </Button>

      <Button
        variant="flat"
        startContent={<Icon name="NavArrowLeft" size="sm" />}
        onPress={onBack}
      >
        {t('Back')}
      </Button>
    </div>
  )
}

interface QRStepProps {
  inviteLink: string
  workspaceName: string
  expiresAt?: Date
  onBack: () => void
}

function QRStep({ inviteLink, workspaceName, expiresAt, onBack }: QRStepProps) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      successToast(t('Link copied!'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      errorToast(t('Failed to copy link'))
    }
  }, [inviteLink, t])

  const handleDownload = useCallback(() => {
    if (!qrRef.current) return

    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    // Create canvas to convert SVG to PNG
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 400 // Higher resolution for download
    canvas.width = size
    canvas.height = size + 60 // Extra space for workspace name

    // White background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Convert SVG to data URL and draw
    const svgData = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      // Center the QR code
      const qrSize = 320
      const x = (size - qrSize) / 2
      const y = 20
      ctx.drawImage(img, x, y, qrSize, qrSize)

      // Add workspace name below QR
      ctx.fillStyle = '#333'
      ctx.font = '20px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(workspaceName, size / 2, size + 30)

      // Download
      const dataUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `invite-${workspaceName.toLowerCase().replace(/\s+/g, '-')}.png`
      a.click()

      URL.revokeObjectURL(url)
      successToast(t('QR code downloaded'))
    }
    img.src = url
  }, [workspaceName, t])

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        ref={qrRef}
        className="rounded-xl bg-white p-4 shadow-sm"
        role="img"
        aria-label={`QR code invite for ${workspaceName}`}
      >
        <QRCode value={inviteLink} size={200} />
      </div>

      <p className="text-center text-sm text-default-600">
        {t('Scan to join')} <strong>{workspaceName}</strong>
      </p>

      {expiresAt && (
        <p className="text-sm text-default-500">
          {t('Expires in')} {formatExpirationDate(expiresAt)}
        </p>
      )}

      <div className="flex w-full flex-col gap-2">
        <Button
          size="lg"
          color="primary"
          className="w-full"
          startContent={<Icon name="Download" size="sm" />}
          onPress={handleDownload}
        >
          {t('Download QR')}
        </Button>

        <Button
          variant="flat"
          className="w-full"
          startContent={<Icon name={copied ? 'Check' : 'Copy'} size="sm" />}
          onPress={handleCopy}
        >
          {copied ? t('Link Copied!') : t('Copy Link')}
        </Button>
      </div>

      <Button
        variant="flat"
        startContent={<Icon name="NavArrowLeft" size="sm" />}
        onPress={onBack}
      >
        {t('Back')}
      </Button>
    </div>
  )
}

interface EmailStepProps {
  onSendInvite: (email: string) => Promise<void>
  onBack: () => void
}

function EmailStep({ onSendInvite, onBack }: EmailStepProps) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sentEmail, setSentEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isValid = isValidEmail(email)

  const handleSend = useCallback(async () => {
    if (!isValid) {
      setError(t('Please enter a valid email'))
      return
    }

    setIsSending(true)
    setError(null)

    try {
      await onSendInvite(email)
      setSentEmail(email)
      setEmail('')
      successToast(
        `${t('Invitation sent to {email}').replace('{email}', email)}`,
      )
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('Failed to send invitation')
      setError(message)
      errorToast(message)
    } finally {
      setIsSending(false)
    }
  }, [email, isValid, onSendInvite, t])

  const handleSendAnother = useCallback(() => {
    setSentEmail(null)
    setError(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  useEffect(() => {
    if (!sentEmail) {
      inputRef.current?.focus()
    }
  }, [sentEmail])

  if (sentEmail) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="rounded-full bg-success/10 p-4">
          <Icon name="CheckCircle" size="xl" className="text-success" />
        </div>

        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">
            {t('Invitation Sent!')}
          </p>
          <p className="text-default-500">
            {t('An invitation has been sent to')} <strong>{sentEmail}</strong>
          </p>
        </div>

        <div className="flex w-full flex-col gap-2">
          <Button
            size="lg"
            color="primary"
            className="w-full"
            startContent={<Icon name="Mail" size="sm" />}
            onPress={handleSendAnother}
          >
            {t('Send Another')}
          </Button>

          <Button
            variant="flat"
            startContent={<Icon name="NavArrowLeft" size="sm" />}
            onPress={onBack}
          >
            {t('Back')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Input
        ref={inputRef}
        type="email"
        label={t('Email Address')}
        placeholder={t('colleague@example.com')}
        value={email}
        onValueChange={(value) => {
          setEmail(value)
          if (error) setError(null)
        }}
        isInvalid={!!error}
        errorMessage={error}
        aria-label="Email address"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && isValid && !isSending) {
            handleSend()
          }
        }}
      />

      <Button
        size="lg"
        color="primary"
        className="w-full"
        isDisabled={!isValid}
        isLoading={isSending}
        startContent={!isSending && <Icon name="Mail" size="sm" />}
        onPress={handleSend}
      >
        {t('Send Invite')}
      </Button>

      <Button
        variant="flat"
        startContent={<Icon name="NavArrowLeft" size="sm" />}
        onPress={onBack}
        isDisabled={isSending}
      >
        {t('Back')}
      </Button>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function InviteFlow({
  isOpen,
  onClose,
  workspaceId: _workspaceId,
  workspaceName,
  inviterName: _inviterName,
  onGenerateLink,
  onSendEmailInvite,
  defaultRole = 'member',
}: InviteFlowProps) {
  const { t } = useI18n()

  // State
  const [step, setStep] = useState<Step>('choose-method')
  const [role, setRole] = useState<WorkspaceRole>(defaultRole)
  const [direction, setDirection] = useState(0)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | undefined>()
  const [isGenerating, setIsGenerating] = useState(false)

  // Focus management
  const titleRef = useRef<HTMLHeadingElement>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('choose-method')
      setRole(defaultRole)
      setInviteLink(null)
      setExpiresAt(undefined)
      setDirection(0)
    }
  }, [isOpen, defaultRole])

  // Announce step changes for screen readers
  useEffect(() => {
    if (step !== 'choose-method') {
      // Give focus to the modal title when step changes
      setTimeout(() => titleRef.current?.focus(), 100)
    }
  }, [step])

  const generateLink = useCallback(async () => {
    setIsGenerating(true)
    try {
      const result = await onGenerateLink(role)
      setInviteLink(result.link)
      setExpiresAt(result.expiresAt)
      return result
    } catch (err) {
      errorToast(t('Failed to generate invite link'))
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [onGenerateLink, role, t])

  const handleMethodSelect = useCallback(
    async (method: InviteMethod) => {
      // For link and QR methods, generate the link first
      if (method === 'link' || method === 'qr') {
        try {
          await generateLink()
          setDirection(1)
          setStep(method)
        } catch {
          // Error already handled in generateLink
        }
      } else {
        setDirection(1)
        setStep(method)
      }
    },
    [generateLink],
  )

  const handleBack = useCallback(() => {
    setDirection(-1)
    setStep('choose-method')
  }, [])

  const handleSendEmailInvite = useCallback(
    async (email: string) => {
      if (!onSendEmailInvite) {
        throw new Error('Email invitations are not enabled')
      }
      await onSendEmailInvite(email, role)
    },
    [onSendEmailInvite, role],
  )

  const getStepTitle = (): string => {
    switch (step) {
      case 'choose-method':
        return t('Invite to {workspace}').replace('{workspace}', workspaceName)
      case 'link':
        return t('Share Invite Link')
      case 'qr':
        return t('QR Code Invite')
      case 'email':
        return t('Email Invite')
      default:
        return ''
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      scrollBehavior="inside"
      aria-labelledby="invite-flow-title"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-2">
          <h2
            id="invite-flow-title"
            ref={titleRef}
            tabIndex={-1}
            className="outline-none"
            aria-live="polite"
          >
            {getStepTitle()}
          </h2>
          <StepIndicator currentStep={step} />
        </ModalHeader>

        <ModalBody className="relative overflow-hidden">
          {isGenerating && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
              <div className="flex flex-col items-center gap-2">
                <Icon
                  name="RefreshDouble"
                  size="lg"
                  animation="spinning"
                  className="text-primary"
                />
                <p className="text-sm text-default-500">
                  {t('Generating invite...')}
                </p>
              </div>
            </div>
          )}

          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
            >
              {step === 'choose-method' && (
                <ChooseMethodStep
                  role={role}
                  onRoleChange={setRole}
                  onMethodSelect={handleMethodSelect}
                  isEmailEnabled={!!onSendEmailInvite}
                />
              )}

              {step === 'link' && inviteLink && (
                <LinkStep
                  inviteLink={inviteLink}
                  expiresAt={expiresAt}
                  onBack={handleBack}
                />
              )}

              {step === 'qr' && inviteLink && (
                <QRStep
                  inviteLink={inviteLink}
                  workspaceName={workspaceName}
                  expiresAt={expiresAt}
                  onBack={handleBack}
                />
              )}

              {step === 'email' && (
                <EmailStep
                  onSendInvite={handleSendEmailInvite}
                  onBack={handleBack}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </ModalBody>

        <ModalFooter className="justify-center">
          <Button variant="light" onPress={onClose}>
            {t('Close')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
