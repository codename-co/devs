/**
 * FeaturesSection — Settings section for conversational AI features.
 *
 * Displays:
 *  - Speech-to-text toggle
 *  - Auto memory learning toggle
 *  - Quick reply suggestions toggle
 *  - Web search grounding toggle
 *  - Hide default agents toggle
 *  - Global system instructions textarea
 */

import { Textarea } from '@heroui/react'
import { useI18n } from '@/i18n'
import { userSettings } from '@/stores/userStore'
import { useHashHighlight } from '@/hooks/useHashHighlight'
import localI18n from '../i18n'
import { Switch } from '@/components'

export function FeaturesSection() {
  const { t } = useI18n(localI18n)
  const { getHighlightClasses } = useHashHighlight()

  const speechToTextEnabled = userSettings((state) => state.speechToTextEnabled)
  const setSpeechToTextEnabled = userSettings(
    (state) => state.setSpeechToTextEnabled,
  )
  const hideDefaultAgents = userSettings((state) => state.hideDefaultAgents)
  const setHideDefaultAgents = userSettings(
    (state) => state.setHideDefaultAgents,
  )
  const autoMemoryLearning = userSettings(
    (state) => state.autoMemoryLearning ?? false,
  )
  const setAutoMemoryLearning = userSettings(
    (state) => state.setAutoMemoryLearning,
  )
  const suggestionsEnabled = userSettings(
    (state) => state.suggestionsEnabled ?? true,
  )
  const setSuggestionsEnabled = userSettings(
    (state) => state.setSuggestionsEnabled,
  )
  const enableWebSearchGrounding = userSettings(
    (state) => state.enableWebSearchGrounding ?? true,
  )
  const setEnableWebSearchGrounding = userSettings(
    (state) => state.setEnableWebSearchGrounding,
  )
  const globalSystemInstructions = userSettings(
    (state) => state.globalSystemInstructions ?? '',
  )
  const setGlobalSystemInstructions = userSettings(
    (state) => state.setGlobalSystemInstructions,
  )

  return (
    <div data-testid="conversational-settings" className="space-y-8">
      <div>
        <h4 className="text-sm font-medium text-default-700 mb-3">
          {t('Conversations')}
        </h4>
        <div
          id="quick-reply-suggestions"
          className={getHighlightClasses('quick-reply-suggestions')}
        >
          <Switch
            isSelected={suggestionsEnabled}
            onChange={(e) => setSuggestionsEnabled(e.target.checked)}
            size="sm"
          >
            <p>{t('Quick Reply Suggestions')}</p>
            <p className="text-xs text-default-500">
              {t(
                'Show AI-generated follow-up suggestions after each assistant response',
              )}
            </p>
          </Switch>
        </div>

        <div
          id="web-search-grounding"
          className={getHighlightClasses('web-search-grounding')}
        >
          <Switch
            isSelected={enableWebSearchGrounding}
            onChange={(e) => setEnableWebSearchGrounding(e.target.checked)}
            size="sm"
          >
            <p>{t('Web Search Grounding')}</p>
            <p className="text-xs text-default-500">
              {t(
                'Allow AI models to search the web for up-to-date information (supported by Google Gemini and Anthropic Claude)',
              )}
            </p>
          </Switch>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-default-700 mb-3">
          {t('Agents')}
        </h4>
        <div
          id="hide-default-agents"
          className={getHighlightClasses('hide-default-agents')}
        >
          <Switch
            isSelected={hideDefaultAgents}
            onChange={(e) => setHideDefaultAgents(e.target.checked)}
            size="sm"
          >
            <p>{t('Hide Default Agents')}</p>
            <p className="text-xs text-default-500">
              {t(
                'Only show your custom agents in the agent picker and agents page',
              )}
            </p>
          </Switch>
        </div>

        <div
          id="global-system-instructions"
          className={getHighlightClasses('global-system-instructions', 'ms-6')}
        >
          <label className="text-sm font-medium text-default-600">
            {t('Global System Instructions')}
          </label>
          <p className="text-xs text-default-500 mb-2">
            {t(
              "These instructions will be prepended to every agent's instructions",
            )}
          </p>
          <Textarea
            placeholder={t(
              'Enter global instructions that apply to all agents...',
            )}
            value={globalSystemInstructions}
            onChange={(e) =>
              setGlobalSystemInstructions(e.target.value || undefined)
            }
            minRows={1}
            maxRows={10}
          />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-default-700 mb-3">
          {t('Knowledge')}
        </h4>
        <div
          id="auto-memory-learning"
          className={getHighlightClasses('auto-memory-learning')}
        >
          <Switch
            isSelected={autoMemoryLearning}
            onChange={(e) => setAutoMemoryLearning(e.target.checked)}
            size="sm"
          >
            <p>{t('Auto Memory Learning')}</p>
            <p className="text-xs text-default-500">
              {t(
                'Automatically extract learnable information from conversations to build agent memory',
              )}
            </p>
          </Switch>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-default-700 mb-3">
          {t('Voice')}
        </h4>
        <div
          id="speech-to-text"
          className={getHighlightClasses('speech-to-text')}
        >
          <Switch
            isSelected={speechToTextEnabled}
            onChange={(e) => setSpeechToTextEnabled(e.target.checked)}
          >
            <p>{t('Enable Speech-to-Text')}</p>
            <p className="text-xs text-default-500">
              {t(
                'Allow voice input using your device microphone in the prompt area',
              )}
            </p>
          </Switch>
        </div>
      </div>
    </div>
  )
}
