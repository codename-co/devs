import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  'Agent Builder': 'Constructor de agentes',
  'Design and configure your custom specialized AI agent':
    'Diseñe y configure su agente de IA especializado personalizado',
  'Agent Profile': 'Perfil del agente',
  "Define your agent's personality and capabilities":
    'Defina la personalidad y las capacidades de su agente',
  'Agent created successfully! Redirecting to agents list...':
    '¡Agente creado con éxito! Redirigiendo a la lista de agentes...',
  Name: 'Nombre',
  'e.g., Mike the Magician': 'ej., Mike el Mago',
  'A friendly name for your agent': 'Un nombre amigable para su agente',
  Role: 'Rol',
  'e.g., Performs magic tricks and illusions':
    'ej., Realiza trucos de magia e ilusiones',
  'What does your agent do?': '¿Qué hace su agente?',
  Instructions: 'Instrucciones',
  "Detailed instructions for the agent's personality, skills, constraints, and goals…":
    'Instrucciones detalladas para la personalidad, las habilidades, las limitaciones y los objetivos del agente…',
  "Detailed instructions for the agent's behavior":
    'Instrucciones detalladas para el comportamiento del agente',
  'Advanced Configuration': 'Configuración avanzada',
  'Configure advanced settings for your agent':
    'Configure los parámetros avanzados de su agente',
  Provider: 'Proveedor',
  Model: 'Modelo',
  Temperature: 'Temperatura',
  'Lower values = more focused, Higher values = more creative':
    'Valores más bajos = más enfocado, Valores más altos = más creativo',
  'Creating...': 'Creando...',
  'Create Agent': 'Crear agente',
  'Reset Form': 'Restablecer formulario',
  'Live Preview': 'Vista previa en vivo',
  Clear: 'Borrar',
  'Start a conversation to test your agent':
    'Inicie una conversación para probar su agente',
  'The chat will use your current form configuration':
    'El chat utilizará su configuración de formulario actual',
  'Ask {agentName} something…': 'Pregunte algo a {agentName}…',
  Send: 'Enviar',
  Current: 'Actual', // current conversation
  'No conversation history yet. Start chatting with this agent to build history.':
    "Pas d'historique de conversation pour le moment. Commencez à discuter avec cet agent pour créer un historique.",
  'No instructions defined.': 'No se han definido instrucciones.',
  '{count} messages': '{count} mensajes',
  Edit: 'Editar',
  Save: 'Guardar',
  Cancel: 'Cancelar',
  'Edit System Prompt': 'Editar prompt del sistema',
  'System prompt updated successfully':
    'Prompt del sistema actualizado con éxito',
  'Enter agent role...': 'Introducir rol del agente...',
  'Enter agent instructions...': 'Introducir instrucciones del agente...',
} as const
