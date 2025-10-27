import { Icon, Section } from '@/components'
import { useSpeechRecognition } from '@/components/PromptArea/useSpeechRecognition'
import { useI18n } from '@/i18n'
import DefaultLayout from '@/layouts/Default'
import { Button, Tooltip } from '@heroui/react'
import { useState } from 'react'

export const VoicePage = () => {
  const { lang, t } = useI18n()

  const [prompt, setPrompt] = useState('')

  // Speech recognition hook
  const {
    isRecording,
    isSupported: isSpeechRecognitionSupported,
    toggleRecording,
  } = useSpeechRecognition({
    lang,
    onTranscript: (transcript) => {
      setPrompt(transcript)
      // onValueChange?.(transcript)
    },
    onFinalTranscript: () => {
      // onSubmitToAgent?.()
    },
  })

  return (
    <DefaultLayout showBackButton={false}>
      <Section
        mainClassName="flex items-center min-h-full"
        className="self-end"
      >
        {prompt}

        <Tooltip content={t('Speak to microphone')} placement="bottom">
          <Button
            isIconOnly
            color={isRecording ? 'primary' : 'default'}
            isDisabled={!isSpeechRecognitionSupported}
            radius="full"
            // variant={isRecording ? 'solid' : 'ghost'}
            variant="ghost"
            size="lg"
            onPress={toggleRecording}
            className="min-w-48 min-h-48"
          >
            {isRecording ? (
              <Icon name="DevsAnimated" size="5xl" className="devs-whole" />
            ) : (
              <Icon name="Voice" size="4xl" />
            )}
          </Button>
        </Tooltip>
      </Section>
    </DefaultLayout>
  )
}
