/**
 * Type declarations for kokoro-js
 *
 * This is a minimal type declaration for the kokoro-js library.
 * The actual library needs to be installed: npm i kokoro-js
 *
 * @see https://github.com/hexgrad/kokoro
 */

declare module 'kokoro-js' {
  export interface KokoroTTSOptions {
    dtype?: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16'
    device?: 'wasm' | 'webgpu' | 'cpu'
    progress_callback?: (progress: {
      status?: string
      loaded?: number
      total?: number
      progress?: number
    }) => void
  }

  export interface KokoroSpeakOptions {
    voice?: string
    speed?: number
  }

  export interface KokoroTTSInstance {
    generate(
      text: string,
      options?: KokoroSpeakOptions,
    ): Promise<{
      audio: Float32Array
      sampling_rate: number
    }>
    list_voices(): string[]
  }

  export class KokoroTTS {
    static from_pretrained(
      modelId: string,
      options?: KokoroTTSOptions,
    ): Promise<KokoroTTSInstance>
  }
}
