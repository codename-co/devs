/**
 * MeetingBot - Playwright-based Google Meet automation
 *
 * This is the "body" of the DEVS meeting agent.
 * It handles browser automation to join meetings, capture transcripts,
 * and relay audio/chat back to the DEVS browser "brain".
 */
import { chromium } from 'playwright'

// Google Meet DOM selectors (may need updates as Google changes their UI)
const SELECTORS = {
  // Pre-join screen
  nameInput: 'input[aria-label="Your name"]',
  joinButton: 'button[jsname="Qx7uuf"]',
  micToggle: 'div[data-is-muted]',
  cameraToggle: 'div[jscontroller="bwqwSd"]',

  // In-meeting
  captionButton:
    'button[aria-label*="caption" i], button[aria-label*="subtitle" i]',
  captionContainer: '.a4cQT, [class*="caption"], [class*="subtitle"]',
  chatButton: 'button[aria-label*="chat" i]',
  chatInput: 'textarea[aria-label*="message" i]',
  chatSendButton: 'button[aria-label*="send" i]',
  participantsList: '[data-participant-id]',
  leaveButton: 'button[aria-label*="leave" i], button[jsname="CQylAd"]',
  reactionButton: 'button[aria-label*="reaction" i]',

  // Lobby/waiting
  askToJoinButton: 'button[jsname="Qx7uuf"]',
  waitingMessage: '[class*="waiting"], [class*="lobby"]',
}

export class MeetingBot {
  constructor(options) {
    this.sessionId = options.sessionId
    this.meetingUrl = options.meetingUrl
    this.botName = options.botName || 'DEVS Agent'
    this.googleAuthToken = options.googleAuthToken
    this.logger = options.logger || console

    // Callbacks
    this.onTranscript = options.onTranscript || (() => {})
    this.onChat = options.onChat || (() => {})
    this.onParticipant = options.onParticipant || (() => {})
    this.onStatus = options.onStatus || (() => {})
    this.onError = options.onError || (() => {})

    this.browser = null
    this.context = null
    this.page = null
    this.isJoined = false
    this.captionObserver = null
  }

  /**
   * Join the Google Meet meeting
   */
  async join() {
    this.logger.info(`Starting browser for meeting: ${this.meetingUrl}`)
    this.onStatus({ status: 'starting', message: 'Launching browser...' })

    try {
      // Launch browser with specific settings for Meet
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--use-fake-ui-for-media-stream', // Auto-accept mic/camera permissions
          '--use-fake-device-for-media-stream', // Use fake media devices
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      })

      // Create context with permissions
      this.context = await this.browser.newContext({
        permissions: ['microphone', 'camera'],
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        locale: 'en-US',
      })

      // Inject Google auth cookies if provided
      if (this.googleAuthToken) {
        await this.injectAuthToken(this.googleAuthToken)
      }

      this.page = await this.context.newPage()

      // Set up console logging from page
      this.page.on('console', (msg) => {
        if (msg.type() === 'error') {
          this.logger.debug(`Page console error: ${msg.text()}`)
        }
      })

      this.onStatus({ status: 'navigating', message: 'Opening meeting...' })

      // Navigate to meeting
      await this.page.goto(this.meetingUrl, { waitUntil: 'networkidle' })

      // Wait for page to load
      await this.page.waitForTimeout(3000)

      // Handle pre-join screen
      await this.handlePreJoin()

      // Click join button
      await this.clickJoinButton()

      // Wait for meeting to start
      await this.waitForMeetingStart()

      this.isJoined = true
      this.onStatus({
        status: 'joined',
        message: 'Successfully joined meeting',
      })

      // Start capturing captions
      await this.startCaptionCapture()

      // Start participant monitoring
      await this.startParticipantMonitoring()
    } catch (err) {
      this.logger.error(`Failed to join meeting: ${err.message}`)
      this.onError(`Failed to join meeting: ${err.message}`)
      await this.cleanup()
      throw err
    }
  }

  /**
   * Inject Google auth token/cookies
   */
  async injectAuthToken(authToken) {
    // If authToken is a cookie object or array
    if (typeof authToken === 'object') {
      const cookies = Array.isArray(authToken) ? authToken : [authToken]
      await this.context.addCookies(cookies)
    }
    // If it's a session token string, we'd need to handle Google's OAuth flow
    // This is a placeholder for more sophisticated auth handling
  }

  /**
   * Handle pre-join screen (name, mic/camera toggles)
   */
  async handlePreJoin() {
    this.onStatus({ status: 'pre-join', message: 'Setting up...' })

    // Try to enter name if input exists
    try {
      const nameInput = await this.page.$(SELECTORS.nameInput)
      if (nameInput) {
        await nameInput.fill(this.botName)
        this.logger.info(`Set display name to: ${this.botName}`)
      }
    } catch (err) {
      this.logger.debug('No name input found or already logged in')
    }

    // Turn off camera
    try {
      const cameraToggle = await this.page.$(
        'div[jscontroller="bwqwSd"][data-anchor-id="psRWwc"]',
      )
      if (cameraToggle) {
        await cameraToggle.click()
        this.logger.info('Turned off camera')
        await this.page.waitForTimeout(500)
      }
    } catch (err) {
      this.logger.debug('Could not toggle camera')
    }

    // Turn off microphone
    try {
      const micToggle = await this.page.$(
        'div[jscontroller="t2mBxb"][data-anchor-id="hw0c9"]',
      )
      if (micToggle) {
        await micToggle.click()
        this.logger.info('Turned off microphone')
        await this.page.waitForTimeout(500)
      }
    } catch (err) {
      this.logger.debug('Could not toggle microphone')
    }
  }

  /**
   * Click the join/ask to join button
   */
  async clickJoinButton() {
    this.onStatus({ status: 'joining', message: 'Requesting to join...' })

    await this.page.waitForTimeout(2000)

    // Try multiple join button selectors
    const joinSelectors = [
      'button[jsname="Qx7uuf"]',
      'button[data-idom-class*="join"]',
      'span:has-text("Join now")',
      'span:has-text("Ask to join")',
    ]

    for (const selector of joinSelectors) {
      try {
        const button = await this.page.$(selector)
        if (button) {
          await button.click()
          this.logger.info('Clicked join button')
          return
        }
      } catch (err) {
        continue
      }
    }

    this.logger.warn('Could not find join button, may already be in meeting')
  }

  /**
   * Wait for the meeting to actually start
   */
  async waitForMeetingStart() {
    this.onStatus({ status: 'waiting', message: 'Waiting to be admitted...' })

    // Wait up to 2 minutes to be admitted
    const maxWait = 120000
    const startTime = Date.now()

    while (Date.now() - startTime < maxWait) {
      // Check if we're in the meeting (look for meeting controls)
      const inMeeting = await this.page.$(
        'button[aria-label*="leave" i], div[jscontroller="kAPMuc"]',
      )
      if (inMeeting) {
        this.logger.info('Successfully entered meeting')
        return
      }

      // Check if still waiting
      const waiting = await this.page.$('[class*="waiting"], [class*="lobby"]')
      if (waiting) {
        this.logger.debug('Still waiting to be admitted...')
      }

      await this.page.waitForTimeout(2000)
    }

    throw new Error('Timeout waiting to join meeting')
  }

  /**
   * Start capturing live captions
   */
  async startCaptionCapture() {
    this.logger.info('Starting caption capture')

    // Try to enable captions
    try {
      const captionButton = await this.page.$(
        'button[aria-label*="caption" i], button[aria-label*="subtitle" i], button[aria-label*="CC" i]',
      )
      if (captionButton) {
        await captionButton.click()
        this.logger.info('Enabled captions')
        await this.page.waitForTimeout(1000)
      }
    } catch (err) {
      this.logger.debug('Could not enable captions automatically')
    }

    // Set up mutation observer for captions
    await this.page.exposeFunction(
      'onCaptionUpdate',
      (speaker, text, timestamp) => {
        this.onTranscript({
          speaker,
          text,
          timestamp,
          sessionId: this.sessionId,
        })
      },
    )

    await this.page.evaluate(() => {
      let lastCaption = ''

      const observer = new MutationObserver((mutations) => {
        // Look for caption containers
        const captionSelectors = [
          '.a4cQT',
          '[class*="caption"]',
          '[class*="subtitle"]',
          '.CNusmb',
        ]

        for (const selector of captionSelectors) {
          const containers = document.querySelectorAll(selector)
          containers.forEach((container) => {
            const text = container.textContent?.trim()
            if (text && text !== lastCaption && text.length > 0) {
              lastCaption = text

              // Try to find speaker name
              let speaker = 'Unknown'
              const speakerEl =
                container.closest('[data-self-name]') ||
                container.querySelector('[data-self-name]') ||
                container.parentElement?.querySelector('[class*="name"]')
              if (speakerEl) {
                speaker =
                  speakerEl.getAttribute('data-self-name') ||
                  speakerEl.textContent ||
                  'Unknown'
              }

              window.onCaptionUpdate(speaker, text, Date.now())
            }
          })
        }
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      })
    })
  }

  /**
   * Monitor participants joining/leaving
   */
  async startParticipantMonitoring() {
    await this.page.exposeFunction(
      'onParticipantChange',
      (action, name, id) => {
        this.onParticipant({
          action,
          name,
          id,
          timestamp: Date.now(),
          sessionId: this.sessionId,
        })
      },
    )

    await this.page.evaluate(() => {
      const knownParticipants = new Set()

      const checkParticipants = () => {
        const participants = document.querySelectorAll('[data-participant-id]')
        const currentIds = new Set()

        participants.forEach((p) => {
          const id = p.getAttribute('data-participant-id')
          const name = p.textContent || 'Unknown'
          currentIds.add(id)

          if (!knownParticipants.has(id)) {
            knownParticipants.add(id)
            window.onParticipantChange('joined', name, id)
          }
        })

        // Check for left participants
        knownParticipants.forEach((id) => {
          if (!currentIds.has(id)) {
            knownParticipants.delete(id)
            window.onParticipantChange('left', 'Unknown', id)
          }
        })
      }

      // Check periodically
      setInterval(checkParticipants, 5000)
    })
  }

  /**
   * Send a chat message
   */
  async sendChat(text) {
    if (!this.isJoined) {
      throw new Error('Not in a meeting')
    }

    this.logger.info(`Sending chat: ${text}`)

    // Open chat panel if needed
    try {
      const chatButton = await this.page.$('button[aria-label*="chat" i]')
      if (chatButton) {
        await chatButton.click()
        await this.page.waitForTimeout(500)
      }
    } catch (err) {
      this.logger.debug('Chat panel may already be open')
    }

    // Find chat input and send
    const chatInput = await this.page.$(
      'textarea[aria-label*="message" i], input[aria-label*="message" i]',
    )
    if (chatInput) {
      await chatInput.fill(text)
      await this.page.keyboard.press('Enter')
      this.logger.info('Chat message sent')
    } else {
      throw new Error('Could not find chat input')
    }
  }

  /**
   * Speak text using TTS (plays through virtual audio device)
   * Note: This requires additional system-level audio routing setup
   */
  async speak(text) {
    if (!this.isJoined) {
      throw new Error('Not in a meeting')
    }

    this.logger.info(`Speaking: ${text}`)

    // Use Web Speech API in the page context
    await this.page.evaluate((textToSpeak) => {
      const utterance = new SpeechSynthesisUtterance(textToSpeak)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      speechSynthesis.speak(utterance)
    }, text)

    // Note: This plays locally in the headless browser.
    // To route this to the meeting requires virtual audio device setup.
    // See README for pulseaudio/virtual cable configuration.
  }

  /**
   * Play pre-generated audio (base64 encoded)
   */
  async playAudio(audioBase64) {
    if (!this.isJoined) {
      throw new Error('Not in a meeting')
    }

    this.logger.info('Playing audio...')

    await this.page.evaluate((audio) => {
      const audioElement = new Audio(`data:audio/wav;base64,${audio}`)
      audioElement.play()
    }, audioBase64)
  }

  /**
   * Send a reaction emoji
   */
  async react(emoji) {
    if (!this.isJoined) {
      throw new Error('Not in a meeting')
    }

    this.logger.info(`Reacting with: ${emoji}`)

    try {
      // Open reactions menu
      const reactionButton = await this.page.$(
        'button[aria-label*="reaction" i]',
      )
      if (reactionButton) {
        await reactionButton.click()
        await this.page.waitForTimeout(500)

        // Find and click the specific emoji
        const emojiButton = await this.page.$(`button[aria-label*="${emoji}"]`)
        if (emojiButton) {
          await emojiButton.click()
        }
      }
    } catch (err) {
      this.logger.debug(`Could not send reaction: ${err.message}`)
    }
  }

  /**
   * Leave the meeting
   */
  async leave() {
    if (!this.isJoined) {
      await this.cleanup()
      return
    }

    this.logger.info('Leaving meeting...')
    this.onStatus({ status: 'leaving', message: 'Leaving meeting...' })

    try {
      // Try to click leave button
      const leaveButton = await this.page.$(
        'button[aria-label*="leave" i], button[jsname="CQylAd"]',
      )
      if (leaveButton) {
        await leaveButton.click()
        await this.page.waitForTimeout(1000)
      }
    } catch (err) {
      this.logger.debug('Could not click leave button')
    }

    this.isJoined = false
    await this.cleanup()
    this.onStatus({ status: 'left', message: 'Left meeting' })
  }

  /**
   * Cleanup browser resources
   */
  async cleanup() {
    try {
      if (this.page) {
        await this.page.close()
        this.page = null
      }
      if (this.context) {
        await this.context.close()
        this.context = null
      }
      if (this.browser) {
        await this.browser.close()
        this.browser = null
      }
    } catch (err) {
      this.logger.error(`Cleanup error: ${err.message}`)
    }
  }
}
