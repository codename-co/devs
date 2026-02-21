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
  'Global system instructions are also applied':
    'Las instrucciones globales del sistema también se aplican',
  '{count} messages': '{count} mensajes',
  Edit: 'Editar',
  Save: 'Guardar',
  Cancel: 'Cancelar',
  'Edit System Prompt': 'Editar prompt del sistema',
  'System prompt updated successfully':
    'Prompt del sistema actualizado con éxito',
  'Enter agent role...': 'Introducir rol del agente...',
  'Enter agent instructions...': 'Introducir instrucciones del agente...',
  // Agent Context panel (unified Knowledge, Memories, Pinned)
  'Agent Context': 'Contexto del agente',
  Files: 'Archivos',
  Memories: 'Memorias',
  Messages: 'Mensajes',
  'Knowledge items updated successfully':
    'Elementos de conocimiento actualizados con éxito',
  'Failed to update knowledge items':
    'Error al actualizar los elementos de conocimiento',
  'Search knowledge items…': 'Buscar elementos de conocimiento…',
  'No knowledge items found.': 'No se encontraron elementos de conocimiento.',
  'Add files to your knowledge base':
    'Añadir archivos a tu base de conocimiento',
  '{count} selected': '{count} seleccionado(s)',
  'No knowledge items associated with this agent.':
    'No hay elementos de conocimiento asociados a este agente.',
  'Add knowledge': 'Añadir conocimiento',
  'No memories learned yet. Start conversations and use "Learn from conversation" to build agent memory.':
    'Aún no hay memorias aprendidas. Inicia conversaciones y usa "Aprender de la conversación" para construir la memoria del agente.',
  'No pinned messages yet. Pin important messages from conversations to make them available here.':
    'Aún no hay mensajes fijados. Fija mensajes importantes de las conversaciones para hacerlos disponibles aquí.',
  'Start Live Conversation': 'Iniciar conversación en vivo',
  // Meta-prompting
  'Creation mode': 'Modo de creación',
  'Describe Your Agent': 'Describe tu agente',
  'Manual Configuration': 'Configuración manual',
  "Tell us what kind of agent you want, and we'll create it for you.":
    'Dinos qué tipo de agente quieres y lo crearemos para ti.',
  'What agent do you need?': '¿Qué agente necesitas?',
  'e.g., A friendly cooking assistant who specializes in Italian cuisine and can suggest wine pairings...':
    'ej., Un asistente de cocina amigable especializado en cocina italiana que puede sugerir maridajes de vinos...',
  'Describe the agent you want to create. Be as specific as you like!':
    '¡Describe el agente que quieres crear. ¡Sé tan específico como quieras!',
  'Generating agent...': 'Generando agente...',
  'Generate Agent': 'Generar agente',
  'Generating...': 'Generando...',
  'Or configure manually': 'O configurar manualmente',
  'No AI provider configured. Please configure one in Settings.':
    'No hay proveedor de LLM configurado. Por favor, configura uno en Ajustes.',
  'Failed to generate agent configuration. Please try again.':
    'Error al generar la configuración del agente. Por favor, inténtalo de nuevo.',
  'Generated configuration is missing required fields.':
    'A la configuración generada le faltan campos obligatorios.',
  Tools: 'Herramientas',
  'No tools enabled for this agent.':
    'No hay herramientas habilitadas para este agente.',
  'Knowledge search': 'Búsqueda de conocimientos',
  // Trace/Tool display
  Duration: 'Duración',
  Tokens: 'Tokens',
  'Loading…': 'Cargando…',
  'Processing step': 'Paso de procesamiento',
  'Processing Details': 'Detalles del procesamiento',
  Status: 'Estado',
  Cost: 'Costo',
  Input: 'Entrada',
  Output: 'Salida',
  Steps: 'Pasos',
  'Trace not found': 'Rastro no encontrado',
  Close: 'Cerrar',
  'View details': 'Ver detalles',
  'View trace details': 'Ver detalles del rastro',
  Error: 'Error',
  'View document': 'Ver documento',
  // Tool display names
  'Searching knowledge base': 'Buscando en la base de conocimientos',
  'Reading document': 'Leyendo documento',
  'Browsing documents': 'Explorando documentos',
  'Summarizing document': 'Resumiendo documento',
  Calculating: 'Calculando',
  'Code interpreter': 'Intérprete de código',
  'Running code': 'Ejecutando código',
  // Gmail tools
  'Searching Gmail': 'Buscando en Gmail',
  'Reading email': 'Leyendo correo',
  'Listing Gmail labels': 'Listando etiquetas de Gmail',
  // Google Drive tools
  'Searching Google Drive': 'Buscando en Google Drive',
  'Reading file from Drive': 'Leyendo archivo de Drive',
  'Listing Drive files': 'Listando archivos de Drive',
  // Google Calendar tools
  'Listing calendar events': 'Listando eventos del calendario',
  'Getting calendar event': 'Obteniendo evento del calendario',
  'Searching calendar': 'Buscando en el calendario',
  // Google Tasks tools
  'Listing tasks': 'Listando tareas',
  'Getting task details': 'Obteniendo detalles de la tarea',
  'Listing task lists': 'Listando listas de tareas',
  // Notion tools
  'Searching Notion': 'Buscando en Notion',
  'Reading Notion page': 'Leyendo página de Notion',
  'Querying Notion database': 'Consultando base de datos de Notion',
  // Generic tool messages
  'Using tool': 'Usando herramienta',
  'Using tools': 'Usando herramientas',
  'Failed to generate agent. Please try again.':
    'Error al generar el agente. Por favor, inténtalo de nuevo.',
  // Tool labels
  'Search Knowledge': 'Buscar conocimiento',
  'Read Document': 'Leer documento',
  'List Documents': 'Listar documentos',
  'Get Document Summary': 'Obtener resumen',
  Calculate: 'Calcular',
  // Search results
  result: 'resultado',
  results: 'resultados',
  // Sources
  Sources: 'Fuentes',
  'View in Knowledge Base': 'Ver en base de conocimiento',
  // Quick replies
  'Generating suggestions…': 'Generando sugerencias…',
  // Tools display
  'No tools available.': 'No hay herramientas disponibles.',
  '{count} tools available': '{count} herramientas disponibles',
  'connected services': 'servicios conectados',
  Knowledge: 'Conocimiento',
  Math: 'Matemáticas',
  Code: 'Código',
  Presentation: 'Presentación',
  Research: 'Investigación',
  Connectors: 'Conectores',
  'Execute Code': 'Ejecutar código',
  'Generate Presentation': 'Generar presentación',
  // Status messages
  'Starting autonomous task orchestration…':
    'Iniciando orquestación autónoma de tareas…',
  'Orchestration failed: {error}': 'Error en la orquestación: {error}',
  'Found relevant information, processing…':
    'Información relevante encontrada, procesando…',
  'Using tools…': 'Usando herramientas…',
  'Using tool: {tool}…': 'Usando herramienta: {tool}…',
  // Recent conversations
  'Recent conversations': 'Conversaciones recientes',
} as const
