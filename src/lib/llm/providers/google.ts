import { OpenAIProvider } from '../index'

export class GoogleProvider extends OpenAIProvider {
  protected baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai'
}
