import { Icon, Section, VoiceWaveform } from '@/components'
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
      <Section mainClassName="flex flex-col items-center justify-end min-h-full gap-8 relative pb-16">
        {/* Voice waveform visualization - Full width background */}
        <div className="absolute inset-0 flex items-center">
          <VoiceWaveform
            isActive={isRecording}
            width={2000}
            height={4000}
            color="hsl(var(--heroui-primary))"
            lineWidth={2}
            className="w-full h-auto min-w-full"
          />
        </div>

        <div className="text-center text-2xl font-medium min-h-16 px-4 max-w-4xl relative z-10">
          {prompt}
        </div>

        <div className="flex justify-center w-full relative z-10">
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
        </div>
      </Section>
    </DefaultLayout>
  )
}
