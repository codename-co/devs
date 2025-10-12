import { IconName } from '@/lib/types'
import * as IconoirIcons from 'iconoir-react'
import { type ComponentProps } from 'react'
import * as SimpleIcons from 'simple-icons'
// @ts-ignore
import DevsAnimatedIcon from '/devs.svg?raw'
// @ts-ignore
import DevsStaticIcon from '/devs-static.svg?raw'

const CustomIcons = {
  Devs: (props: any) => (
    <span
      style={{
        display: 'block',
        width: props.width ?? 24,
        height: props.height ?? 24,
      }}
      {...props}
      dangerouslySetInnerHTML={{ __html: DevsStaticIcon }}
    />
  ),
  DevsAnimated: (props: any) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      {...props}
      dangerouslySetInnerHTML={{
        __html: DevsAnimatedIcon.replace(/<svg[^>]*>/, '').replace(
          /<\/svg>/,
          '',
        ),
      }}
    />
  ),

  DeepSeek: (props: any) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      viewBox="0 0 24 24"
      {...props}
      fill="currentColor"
    >
      <path d="M23.749 4.88c-.256-.12-.366.108-.514.225-.05.038-.094.087-.136.131-.373.386-.808.64-1.373.608-.83-.044-1.538.21-2.164.823-.133-.758-.575-1.21-1.247-1.502-.352-.15-.709-.3-.954-.63-.173-.232-.22-.492-.307-.749-.053-.154-.108-.312-.293-.34-.2-.03-.277.133-.355.27-.313.551-.434 1.164-.423 1.782.028 1.39.635 2.498 1.84 3.288.136.09.171.181.13.313-.084.27-.18.535-.269.806-.054.174-.136.212-.327.135a5.504 5.327 0 0 1-1.737-1.142c-.857-.803-1.63-1.69-2.598-2.382a11 11 0 0 0-.687-.456c-.986-.928.13-1.69.387-1.78.27-.094.093-.418-.78-.415-.87.004-1.67.287-2.684.663a2.81 2.72 0 0 1-.466.131 9.655 9.343 0 0 0-2.883-.097c-1.884.205-3.391 1.07-4.498 2.542C.08 8.875-.23 10.888.15 12.99c.403 2.211 1.569 4.046 3.36 5.478 1.86 1.484 4 2.212 6.44 2.072 1.481-.082 3.133-.274 4.994-1.8.47.224.963.314 1.78.383.63.057 1.236-.03 1.706-.124.735-.15.684-.81.418-.932-2.156-.972-1.682-.576-2.113-.897 1.095-1.255 2.747-2.56 3.392-6.784.05-.337.007-.547 0-.82-.004-.165.035-.23.23-.248a4.128 3.995 0 0 0 1.545-.46c1.397-.74 1.96-1.953 2.092-3.408.02-.222-.004-.453-.245-.57m-12.17 13.096c-2.09-1.592-3.101-2.114-3.52-2.092-.39.021-.32.455-.234.738.09.278.207.471.372.715.114.163.192.405-.113.584-.673.406-1.843-.135-1.897-.16-1.361-.776-2.5-1.802-3.302-3.204-.773-1.35-1.224-2.799-1.298-4.343-.02-.376.094-.507.477-.574a4.742 4.59 0 0 1 1.53-.038c2.132.303 3.946 1.226 5.466 2.687.869.835 1.525 1.83 2.202 2.803.72 1.032 1.494 2.017 2.48 2.822.347.283.625.5.892.657-.802.087-2.14.106-3.055-.595m1-6.24a.308.297 0 1 1 .615 0 .3.3 0 0 1-.309.298.304.294 0 0 1-.306-.299zm3.11 1.547c-.198.078-.398.146-.59.155a1.259 1.218 0 0 1-.797-.247c-.274-.222-.47-.346-.553-.735a1.77 1.714 0 0 1 .016-.57c.071-.317-.008-.519-.237-.705-.189-.15-.427-.19-.69-.19a.557.54 0 0 1-.254-.077c-.11-.054-.2-.185-.113-.347.026-.052.161-.18.191-.203.356-.196.766-.132 1.146.015.353.14.618.397 1.001.757.392.438.462.56.685.886.175.258.336.522.446.824.066.187-.02.341-.25.437z" />
    </svg>
  ),

  Langfuse: (props: any) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      viewBox="0 0 24 24"
      {...props}
      fill="currentColor"
    >
      <path d="M6.666 13.224c1.982.013 3.143.159 4.014.551a6.07 6.07 0 011.298.79l.425.36c1.002.819 2.202 1.276 3.52 1.027.21-.04.414-.093.613-.16a6.226 6.226 0 012.483.163l.317.094c.517.167.978.389 1.396.651l.234.155-.155.187c-1.012 1.157-2.411 1.882-3.93 2l-.168.01c-1.42.072-2.677-.344-3.828-1.128l.02-.017-.308-.223a8.446 8.446 0 01-.357-.274l-.191-.159-.343-.178c-1.24-.623-2.3-.943-3.105-1.15l-.794-.194-.223-.058-.018.048.016-.049-.01-.003-.016.053.013-.053a3.725 3.725 0 01-.749-.302l-.262-.144-.261-.163a2.396 2.396 0 01-.622-.578l-.11-.173-.097-.188a2.386 2.386 0 01-.213-.74l-.009-.1.22-.021.187-.014c.156-.01.313-.016.49-.019h.523zm-5.438 1.27c.08.327.172.633.27.915l.09.25c.165.438.373.856.62 1.248l-1.53 1.007c-.03.022-.07 0-.07-.047V14.8l.004-.023.015-.022.6-.26zm21.07-4.012l.05.195.039.174.015.108c.026.263.042.53.047.803l-.002.399c-.01.396-.045.786-.103 1.168l-.06.344a9.772 9.772 0 00-2.983-1.045l.03-.13c.047-.24.074-.486.08-.734a2.391 2.391 0 00-.02-.418l-.006-.033a11.45 11.45 0 002.562-.7l.35-.13zM12.13 6.022c1.17-.927 2.718-1.558 4.585-1.391a6.268 6.268 0 012.65.856l.22.14c.364.244.71.556 1.041.926l.183.221-.233.095-.212.122a6.501 6.501 0 01-.654.314c-.147.055-.3.108-.46.157a6.276 6.276 0 01-2.78.22c-.941-.238-1.958-.085-2.852.396-.406.21-.785.487-1.121.822l-.332.35-.182.18-.384.351a5.83 5.83 0 01-1.052.675c-.828.41-1.986.517-4.017.43l-.636-.032-.248-.017-.098-.01.112-.23c.136-.254.308-.502.522-.74.259-.288.537-.514.827-.69l.19-.101.128-.064.118-.053.209-.082a12.304 12.304 0 001.587-.762c1.105-.612 2.1-1.35 2.751-1.97l.138-.112zm-11.473.29l.023.01.27.229c.277.226.573.442.89.642l.352.212-.145.215c-.168.263-.321.549-.455.86l-.11.272a6.071 6.071 0 00-.175.54l-.056.223-.628-.612a.058.058 0 01-.015-.039V6.366c0-.036.025-.057.05-.055z"></path>
      <path d="M7.62 5.05a6.303 6.303 0 013.226.898l.235.146-.199.163a14.74 14.74 0 01-2.64 1.684l-.131.061-.306.136-.306.125a4.425 4.425 0 00-.65.294l-.127.069a4.265 4.265 0 00-2.149 3.406l-.01.21v.257l.027.541c0 .278.041.794.319 1.352l.09.168c.082.14.17.266.259.377.196.257.423.466.667.636l.247.16c.409.26.912.495 1.42.625l.765.184c.348.085.647.165.958.26.822.251 1.62.576 2.452 1.021l.162.136-.156.12c-.677.503-2.277 1.475-4.438 1.282a6.276 6.276 0 01-2.654-.861 5.79 5.79 0 01-1.653-1.478l-.131-.202a7.616 7.616 0 01-1.124-2.815l-.07-.377-.031.015a9.423 9.423 0 01-.03-2.903l.025.026.096-.696c.03-.137.062-.27.096-.4l.076-.27a6.233 6.233 0 01.88-1.82l.286-.376C4.103 5.99 5.548 5.192 7.158 5.07l.167-.011.296-.008zm7.85 8.03c.682-.044 1.446-.029 2.275.012l.42.022a8.9 8.9 0 01.73.071 12.967 12.967 0 013.036 1.023l.444.222c.304.184.56.362.764.515l.237.184.013.016.005.022v2.491l-.003.017-.004.01a.05.05 0 01-.021.018l-.027.005-.01-.003-.015-.01-.148-.127a9.245 9.245 0 00-1.431-.987l-.236-.126-.104-.077a6.994 6.994 0 00-2.269-1.074l-.25-.062a6.939 6.939 0 00-2.395-.118l-.157.021-.2.062-.178.045-.183.04c-1.274.238-2.348-.363-2.988-.869l-.298-.248.216-.165c.258-.187.529-.353.813-.495.506-.252 1.166-.384 1.964-.435zm7.846-7.004a.048.048 0 01.07.013l.008.027v3.057l-.006.024-.017.018a10.98 10.98 0 01-1.864.912c-.262.09-.479.157-.733.223-.514.135-1.058.258-1.526.347l-.317.057c-.285.034-.58.056-.885.066l-.338.006c-1.792.002-3.149-.083-4.145-.462l-.208-.085a6.075 6.075 0 01-.726-.384l-.14-.09c.122-.118.242-.241.36-.37l.157-.163c.161-.157.333-.3.512-.425.843-.566 1.851-.77 2.778-.535l.312.04a6.962 6.962 0 002.51-.202l.256-.074c.195-.06.38-.128.556-.2l.487-.209c.227-.103.437-.212.63-.326l.087-.035a10.827 10.827 0 002.182-1.23z"></path>
    </svg>
  ),

  OpenRouter: (props: any) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      viewBox="0 0 512 512"
      {...props}
      fill="currentColor"
    >
      <path
        d="M3 248.945C18 248.945 76 236 106 219C136 202 136 202 198 158C276.497 102.293 332 120.945 423 120.945"
        stroke-width="90"
      />
      <path d="M511 121.5L357.25 210.268L357.25 32.7324L511 121.5Z" />
      <path
        d="M0 249C15 249 73 261.945 103 278.945C133 295.945 133 295.945 195 339.945C273.497 395.652 329 377 420 377"
        stroke-width="90"
      />
      <path d="M508 376.445L354.25 287.678L354.25 465.213L508 376.445Z" />
    </svg>
  ),
}

const SimpleIconToComponent = (icon: any) => {
  return (props: any) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      dangerouslySetInnerHTML={{ __html: icon.svg }}
    />
  )
}

export const Icons = {
  // Iconoir icons
  ArrowRight: IconoirIcons.ArrowRight,
  Attachment: IconoirIcons.Attachment,
  Book: IconoirIcons.Book,
  Brain: IconoirIcons.Brain,
  Calendar: IconoirIcons.Calendar,
  ChatBubble: IconoirIcons.ChatBubble,
  ChatLines: IconoirIcons.ChatLines,
  ChatPlusIn: IconoirIcons.ChatPlusIn,
  CheckCircle: IconoirIcons.CheckCircle,
  ChevronLeft: IconoirIcons.ArrowLeft,
  ChevronRight: IconoirIcons.ArrowRight,
  Circle: IconoirIcons.Circle,
  Clock: IconoirIcons.Clock,
  Code: IconoirIcons.Code,
  Copy: IconoirIcons.Copy,
  Crown: IconoirIcons.Crown,
  CubeScan: IconoirIcons.CubeScan,
  Database: IconoirIcons.Database,
  DatabaseBackup: IconoirIcons.DatabaseBackup,
  DatabaseExport: IconoirIcons.DatabaseExport,
  DatabaseRestore: IconoirIcons.DatabaseRestore,
  DatabaseXmark: IconoirIcons.DatabaseXmark,
  DesignPencil: IconoirIcons.DesignPencil,
  Document: IconoirIcons.Page,
  Download: IconoirIcons.Download,
  EditPencil: IconoirIcons.EditPencil,
  Emoji: IconoirIcons.Emoji,
  EmojiBall: IconoirIcons.EmojiBall,
  EmojiBlinkLeft: IconoirIcons.EmojiBlinkLeft,
  EmojiBlinkRight: IconoirIcons.EmojiBlinkRight,
  EmojiLookDown: IconoirIcons.EmojiLookDown,
  EmojiLookLeft: IconoirIcons.EmojiLookLeft,
  EmojiLookRight: IconoirIcons.EmojiLookRight,
  EmojiLookUp: IconoirIcons.EmojiLookUp,
  EmojiPuzzled: IconoirIcons.EmojiPuzzled,
  EmojiQuite: IconoirIcons.EmojiQuite,
  EmojiReally: IconoirIcons.EmojiReally,
  EmojiSad: IconoirIcons.EmojiSad,
  EmojiSatisfied: IconoirIcons.EmojiSatisfied,
  EmojiSingLeft: IconoirIcons.EmojiSingLeft,
  EmojiSingLeftNote: IconoirIcons.EmojiSingLeftNote,
  EmojiSingRight: IconoirIcons.EmojiSingRight,
  EmojiSingRightNote: IconoirIcons.EmojiSingRightNote,
  EmojiSurprise: IconoirIcons.EmojiSurprise,
  EmojiSurpriseAlt: IconoirIcons.EmojiSurpriseAlt,
  EmojiTalkingAngry: IconoirIcons.EmojiTalkingAngry,
  EmojiTalkingHappy: IconoirIcons.EmojiTalkingHappy,
  EmojiThinkLeft: IconoirIcons.EmojiThinkLeft,
  EmojiThinkRight: IconoirIcons.EmojiThinkRight,
  EvPlugXmark: IconoirIcons.EvPlugXmark,
  Expand: IconoirIcons.Expand,
  Folder: IconoirIcons.Folder,
  Html5: IconoirIcons.Html5,
  Internet: IconoirIcons.Internet,
  LightBulbOn: IconoirIcons.LightBulbOn,
  Lock: IconoirIcons.Lock,
  MathBook: IconoirIcons.MathBook,
  MediaImage: IconoirIcons.MediaImage,
  Microphone: IconoirIcons.Microphone,
  MicrophoneSpeaking: IconoirIcons.MicrophoneSpeaking,
  MoreHoriz: IconoirIcons.MoreHoriz,
  MoreVert: IconoirIcons.MoreVert,
  MusicNoteSolid: IconoirIcons.MusicNoteSolid,
  OpenInBrowser: IconoirIcons.OpenInBrowser,
  Page: IconoirIcons.Page,
  PagePlus: IconoirIcons.PagePlus,
  PageSearch: IconoirIcons.PageSearch,
  Pause: IconoirIcons.Pause,
  PcNoEntry: IconoirIcons.PcNoEntry,
  PiggyBank: IconoirIcons.PiggyBank,
  Play: IconoirIcons.Play,
  Plus: IconoirIcons.Plus,
  Presentation: IconoirIcons.Presentation,
  PrivacyPolicy: IconoirIcons.PrivacyPolicy,
  ProfileCircle: IconoirIcons.ProfileCircle,
  QuestionMark: IconoirIcons.QuestionMark,
  RefreshDouble: IconoirIcons.RefreshDouble,
  Search: IconoirIcons.Search,
  Server: IconoirIcons.Server,
  Settings: IconoirIcons.Settings,
  Share: IconoirIcons.ShareIos,
  SidebarCollapse: IconoirIcons.SidebarCollapse,
  SidebarExpand: IconoirIcons.SidebarExpand,
  Sparks: IconoirIcons.Sparks,
  SparkSolid: IconoirIcons.SparkSolid,
  SparksSolid: IconoirIcons.SparksSolid,
  Star: IconoirIcons.Star,
  Strategy: IconoirIcons.Strategy,
  TaskSolid: IconoirIcons.TaskList,
  Terminal: IconoirIcons.Terminal,
  Timer: IconoirIcons.Timer,
  Trash: IconoirIcons.Trash,
  TriangleFlagTwoStripes: IconoirIcons.TriangleFlagTwoStripes,
  Upload: IconoirIcons.Upload,
  User: IconoirIcons.User,
  UserPlus: IconoirIcons.UserPlus,
  WebWindow: IconoirIcons.WebWindow,
  X: IconoirIcons.X,
  Xmark: IconoirIcons.Xmark,

  // Simple icons
  Anthropic: SimpleIconToComponent(SimpleIcons['siAnthropic']),
  GitHub: SimpleIconToComponent(SimpleIcons['siGithub']),
  Google: SimpleIconToComponent(SimpleIcons['siGoogle']),
  GoogleCloud: SimpleIconToComponent(SimpleIcons['siGooglecloud']),
  HuggingFace: SimpleIconToComponent(SimpleIcons['siHuggingface']),
  MistralAI: SimpleIconToComponent(SimpleIcons['siMistralai']),
  Ollama: SimpleIconToComponent(SimpleIcons['siOllama']),
  OpenAI: SimpleIconToComponent(SimpleIcons['siOpenai']),

  // Custom icons
  ...CustomIcons,
}

export type IconProps = ComponentProps<'svg'> & {
  name: IconName
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
  animation?: 'appear' | 'spin' | 'loading' | 'thinking' | 'pulsating'
}

const sizeMap = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
}

export function Icon({ name, size = 'md', animation, ...props }: IconProps) {
  const IconComponent = Icons[
    name as keyof typeof Icons
  ] as React.ComponentType<any>

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`)
    return null
  }

  return (
    <IconComponent
      width={sizeMap[size]}
      height={sizeMap[size]}
      {...props}
      className={`shrink-0 ${animation ? `anim-${animation}` : ''} ${props.className ?? ''}`}
    />
  )
}
