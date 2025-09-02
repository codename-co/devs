import { useEffect, useState } from 'react'
import { Input, Switch, Alert, Divider, Snippet, Spinner } from '@heroui/react'
import { Icon } from './Icon'
import { generateSetupQRData, generateSetupQRCode } from '@/lib/easy-qr'
import { successToast, errorToast } from '@/lib/toast'
import { useI18n } from '@/i18n'
import { loadCustomAgents } from '@/stores/agentStore'

export const EasySetupExport = () => {
  const { lang, t } = useI18n()
  const [password, setPassword] = useState('')
  const [includeAllAgents, setIncludeAllAgents] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [agentsCount, setAgentsCount] = useState<number>(0)

  useEffect(() => {
    const fetchAgentsCount = async () => {
      const agents = await loadCustomAgents()
      setAgentsCount(agents.length)
    }

    fetchAgentsCount()
  }, [])

  const generate = async () => {
    try {
      const setupUrl = await generateSetupQRData(password, {
        includeAllAgents,
        language: lang,
      })

      setGeneratedUrl(setupUrl)

      // Also generate QR code immediately
      setIsGeneratingQR(true)
      try {
        const qrCode = await generateSetupQRCode(setupUrl)
        setQrCodeDataUrl(qrCode)
      } catch (qrError) {
        console.warn('QR code generation failed:', qrError)
        // Continue without QR code if it fails
      } finally {
        setIsGeneratingQR(false)
      }

      successToast(
        'Setup URL Generated',
        'Share the URL or scan the QR code with your team',
      )
    } catch (error) {
      console.error('Failed to generate setup:', error)
      errorToast(
        'Export Failed',
        error instanceof Error ? error.message : 'Failed to generate setup URL',
      )
    }
  }

  useEffect(() => void generate(), [password, includeAllAgents])

  return (
    <div className="space-y-4">
      <Alert icon={<Icon name="LightBulbOn" />} variant="faded">
        {t(
          'Export your current agents and LLM provider settings and share it via URL or QR code.',
        )}
      </Alert>

      {agentsCount > 0 && (
        <Switch
          isSelected={includeAllAgents}
          onValueChange={setIncludeAllAgents}
          size="sm"
        >
          {t('Include my {n} agents', { n: agentsCount })}
        </Switch>
      )}

      <Input
        type="password"
        // label="Password"
        placeholder="Password (optional)"
        name="share-password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        startContent={<Icon name="Lock" />}
        description={password && 'This password will be needed at setup time'}
        className="max-w-xs"
      />

      <Divider />

      <p className="text-sm font-medium text-gray-600">
        {t('Now you can share the platform configuration…')}
      </p>

      <div className="flex flex-row gap-4">
        <div className="flex flex-col gap-2 flex-2">
          <p className="text-sm font-medium text-gray-600">
            {t('Either with this URL:')}
          </p>

          <Snippet
            symbol={false}
            copyIcon={<Icon name="Copy" />}
            tooltipProps={{ content: t('Copy to clipboard') }}
            classNames={{
              pre: 'whitespace-pre-wrap break-all max-h-16 overflow-y-hidden',
            }}
          >
            {generatedUrl}
          </Snippet>
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <p className="text-sm font-medium text-gray-600">
            {t('Or this QR Code:')}
          </p>

          {isGeneratingQR ? (
            <Spinner size="lg" />
          ) : qrCodeDataUrl ? (
            <div className="flex justify-center">
              <img
                src={qrCodeDataUrl}
                alt="Team Setup QR Code"
                className="border rounded-lg shadow-sm"
                style={{ maxWidth: 240, height: 'auto' }}
              />
            </div>
          ) : (
            <Alert color="warning">
              {t('QR code generation failed. You can still use the URL above.')}
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}
