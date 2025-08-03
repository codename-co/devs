import { IconName } from '@/lib/types'
import * as IconoirIcons from 'iconoir-react'
import { type ComponentProps } from 'react'
import * as SimpleIcons from 'simple-icons'

const CustomIcons = {
  Devs: (props: any) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      viewBox="4 4 24 24"
      {...props}
      fill="currentColor"
    >
      {/* Central core with subtle glow */}
      <circle cx="16" cy="16" r="2" opacity="0.75" />
      <circle cx="16" cy="16" r="3" opacity="0.15" />

      {/* Inner ring - 6 points */}
      <circle cx="16" cy="10" r="1.5" opacity="0.6" />
      <circle cx="21" cy="13" r="1.5" opacity="0.6" />
      <circle cx="21" cy="19" r="1.5" opacity="0.6" />
      <circle cx="16" cy="22" r="1.5" opacity="0.6" />
      <circle cx="11" cy="19" r="1.5" opacity="0.6" />
      <circle cx="11" cy="13" r="1.5" opacity="0.6" />
    </svg>
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
      {...props}
      dangerouslySetInnerHTML={{ __html: icon.svg }}
    />
  )
}

export const Icons = {
  // Iconoir icons
  Attachment: IconoirIcons.Attachment,
  Book: IconoirIcons.Book,
  Brain: IconoirIcons.Brain,
  ChatBubble: IconoirIcons.ChatBubble,
  ChatLines: IconoirIcons.ChatLines,
  ChatPlusIn: IconoirIcons.ChatPlusIn,
  CheckCircle: IconoirIcons.CheckCircle,
  Crown: IconoirIcons.Crown,
  LightBulbOn: IconoirIcons.LightBulbOn,
  Lock: IconoirIcons.Lock,
  MathBook: IconoirIcons.MathBook,
  Microphone: IconoirIcons.Microphone,
  MoreHoriz: IconoirIcons.MoreHoriz,
  MusicNoteSolid: IconoirIcons.MusicNoteSolid,
  PageSearch: IconoirIcons.PageSearch,
  PiggyBank: IconoirIcons.PiggyBank,
  Plus: IconoirIcons.Plus,
  ProfileCircle: IconoirIcons.ProfileCircle,
  Server: IconoirIcons.Server,
  Settings: IconoirIcons.Settings,
  SidebarCollapse: IconoirIcons.SidebarCollapse,
  SidebarExpand: IconoirIcons.SidebarExpand,
  Sparks: IconoirIcons.Sparks,
  SparkSolid: IconoirIcons.SparkSolid,
  SparksSolid: IconoirIcons.SparksSolid,
  Star: IconoirIcons.Star,
  Trash: IconoirIcons.Trash,
  User: IconoirIcons.User,
  UserPlus: IconoirIcons.UserPlus,
  X: IconoirIcons.X,

  // Simple icons
  Anthropic: SimpleIconToComponent(SimpleIcons['siAnthropic']),
  Google: SimpleIconToComponent(SimpleIcons['siGoogle']),
  GoogleCloud: SimpleIconToComponent(SimpleIcons['siGooglecloud']),
  HuggingFace: SimpleIconToComponent(SimpleIcons['siHuggingface']),
  MistralAI: SimpleIconToComponent(SimpleIcons['siMistralai']),
  Ollama: SimpleIconToComponent(SimpleIcons['siOllama']),
  OpenAI: SimpleIconToComponent(SimpleIcons['siOpenai']),

  // Custom icons
  ...CustomIcons,
}

type IconProps = ComponentProps<'svg'> & {
  name: IconName
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
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

export function Icon({ name, size = 'md', ...props }: IconProps) {
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
      className="shrink-0"
      {...props}
    />
  )
}
