/**
 * Audio Utilities
 *
 * Helper classes for recording and playing audio
 */

/**
 * Audio Recorder Utility
 *
 * Records audio from microphone with configurable sample rate
 * Outputs 16-bit PCM at 16kHz (optimal for speech recognition)
 */
export class AudioRecorderUtil {
  private audioContext: AudioContext | null = null
  private stream: MediaStream | null = null
  private scriptProcessor: ScriptProcessorNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private isRecording = false
  private audioChunks: Float32Array[] = []
  private dataCallbacks: Set<(data: Float32Array) => void> = new Set()

  readonly sampleRate = 16000

  async start(): Promise<void> {
    if (this.isRecording) return

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      this.audioContext = new AudioContext({ sampleRate: this.sampleRate })
      this.source = this.audioContext.createMediaStreamSource(this.stream)

      // Use ScriptProcessor for real-time audio access
      const bufferSize = 4096
      this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1)

      this.scriptProcessor.onaudioprocess = (event) => {
        if (!this.isRecording) return

        const inputData = event.inputBuffer.getChannelData(0)
        const samples = new Float32Array(inputData)

        this.audioChunks.push(samples)
        this.dataCallbacks.forEach((cb) => cb(samples))
      }

      this.source.connect(this.scriptProcessor)
      this.scriptProcessor.connect(this.audioContext.destination)

      this.isRecording = true
      this.audioChunks = []
    } catch (error) {
      console.error('[AudioRecorder] Failed to start:', error)
      throw error
    }
  }

  async stop(): Promise<ArrayBuffer> {
    this.isRecording = false

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect()
      this.scriptProcessor = null
    }

    if (this.source) {
      this.source.disconnect()
      this.source = null
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }

    if (this.audioContext) {
      await this.audioContext.close()
      this.audioContext = null
    }

    // Combine all chunks into a single buffer
    return this.getAudioData().buffer as ArrayBuffer
  }

  pause(): void {
    this.isRecording = false
  }

  resume(): void {
    if (this.audioContext && this.stream) {
      this.isRecording = true
    }
  }

  getAudioData(): Float32Array {
    const totalLength = this.audioChunks.reduce((acc, chunk) => acc + chunk.length, 0)
    const combined = new Float32Array(totalLength)
    let offset = 0
    for (const chunk of this.audioChunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }
    return combined
  }

  /**
   * Convert Float32Array to 16-bit PCM ArrayBuffer
   */
  static float32ToPCM16(float32: Float32Array): ArrayBuffer {
    const pcm16 = new Int16Array(float32.length)
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]))
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return pcm16.buffer
  }

  /**
   * Convert 16-bit PCM ArrayBuffer to Float32Array
   */
  static pcm16ToFloat32(pcm16: ArrayBuffer): Float32Array {
    const int16 = new Int16Array(pcm16)
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff)
    }
    return float32
  }

  onData(callback: (data: Float32Array) => void): () => void {
    this.dataCallbacks.add(callback)
    return () => this.dataCallbacks.delete(callback)
  }
}

/**
 * Audio Player Utility
 *
 * Plays audio from Float32Array or ArrayBuffer
 */
export class AudioPlayerUtil {
  private audioContext: AudioContext | null = null
  private currentSource: AudioBufferSourceNode | null = null
  private gainNode: GainNode | null = null
  private _isPlaying = false
  private _isPaused = false
  private pauseTime = 0
  private startTime = 0
  private currentBuffer: AudioBuffer | null = null

  async play(audio: Float32Array | ArrayBuffer, sampleRate: number): Promise<void> {
    this.stop()

    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }

    // Resume if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    // Convert ArrayBuffer to Float32Array if needed
    let floatData: Float32Array
    if (audio instanceof ArrayBuffer) {
      floatData = new Float32Array(audio)
    } else {
      floatData = audio
    }

    // Create audio buffer
    this.currentBuffer = this.audioContext.createBuffer(1, floatData.length, sampleRate)
    // Copy the data to the audio buffer
    const channelData = this.currentBuffer.getChannelData(0)
    channelData.set(floatData)

    return this.playBuffer(0)
  }

  private async playBuffer(offset: number): Promise<void> {
    if (!this.audioContext || !this.currentBuffer) return

    return new Promise((resolve) => {
      const source = this.audioContext!.createBufferSource()
      source.buffer = this.currentBuffer

      // Create gain node for volume control
      this.gainNode = this.audioContext!.createGain()
      source.connect(this.gainNode)
      this.gainNode.connect(this.audioContext!.destination)

      this.currentSource = source
      this._isPlaying = true
      this._isPaused = false
      this.startTime = this.audioContext!.currentTime - offset

      source.onended = () => {
        if (!this._isPaused) {
          this._isPlaying = false
          this.currentSource = null
        }
        resolve()
      }

      source.start(0, offset)
    })
  }

  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop()
      } catch {
        // Ignore if already stopped
      }
      this.currentSource = null
    }
    this._isPlaying = false
    this._isPaused = false
    this.pauseTime = 0
  }

  pause(): void {
    if (!this._isPlaying || this._isPaused || !this.audioContext) return

    this.pauseTime = this.audioContext.currentTime - this.startTime
    this._isPaused = true

    if (this.currentSource) {
      this.currentSource.stop()
      this.currentSource = null
    }
  }

  resume(): void {
    if (!this._isPaused || !this.currentBuffer) return

    this._isPaused = false
    this.playBuffer(this.pauseTime)
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume))
    }
  }

  isPlaying(): boolean {
    return this._isPlaying && !this._isPaused
  }

  async dispose(): Promise<void> {
    this.stop()
    if (this.audioContext) {
      await this.audioContext.close()
      this.audioContext = null
    }
  }
}
