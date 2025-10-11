import type { I18n } from '@/i18n/locales'

export const es: I18n = {
  // AgentPicker
  'Available Agents': 'Agentes disponibles',
  Scientists: 'Científicos',
  Advisors: 'Asesores',
  Artists: 'Artistas',
  Philosophers: 'Filósofos',
  Musicians: 'Músicos',
  Writers: 'Escritores',
  'Other Agents': 'Otros agentes',

  // AppDrawer
  'Expand sidebar': 'Agrandir la barra lateral',
  'Collapse sidebar': 'Réduire la barre latérale',
  'New Task': 'Nueva tarea',
  'New Team': 'Nuevo equipo',
  Tasks: 'Tareas',
  Teams: 'Equipos',
  Settings: 'Configuraciones',
  Agents: 'Agentes',
  Conversations: 'Conversaciones',
  'Conversations history': 'Historial de conversaciones',
  Knowledge: 'Conocimientos',
  Connectors: 'Conectores',
  'New chat': 'Nuevo intercambio',
  AGENTS: 'AGENTES',
  CONVERSATIONS: 'CONVERSACIONES',
  'View all agents': 'Ver todos los agentes',
  'View all history': 'Ver todo el historial',
  Chat: 'Chat',
  'Main navigation': 'Navegación principal',
  'New Agent': 'Nuevo agente',
  'Upgrade to Pro': 'Actualizar a Pro',

  // PromptArea
  'Need something done?': '¿Necesitas que se haga algo?',
  'More actions': 'Más acciones',
  'Attach a file or image': 'Adjuntar un archivo o imagen',
  'Upload new file': 'Subir nuevo archivo',
  'Choose from knowledge base': 'Elegir de la base de conocimientos',
  'Drop files here…': 'Suelta archivos aquí…',
  'Use microphone': 'Usar micrófono',
  'Send prompt': 'Enviar prompt',
  'Select an agent': 'SSeleccionar un agente',
  'Select a model': 'SSeleccionar un modelo',
  'Add Provider': 'Agregar proveedor',

  // Page: /404
  'Page not found': 'Página no encontrada',

  // Page: /
  'Let your agents take it from here':
    'Deja que tus agentes se encarguen de esto',
  'Delegate complex tasks to your own AI teams':
    'Delegar tareas complejas a tus propios equipos de IA',
  'Failed to get response from LLM. Please try again later.':
    'Error al obtener respuesta del LLM. Por favor, inténtalo de nuevo más tarde.',

  // LLM Integration
  'No LLM provider configured. Please [configure one in Settings]({path}).':
    'Ningún proveedor de LLM configurado. Por favor, [configura uno en Configuraciones]({path}).',

  // MarkdownRenderer
  'Thinking…': 'Pensando…',
  Thoughts: 'Pensamientos',

  // AgentsPage
  'My Agents ({count})': 'Mis agentes ({count})',
  'Built-in Agents ({count})': 'Agentes integrados ({count})',
  'Built-in agents are pre-configured agents that come with the platform. They showcase various capabilities and can serve as inspiration for your own custom agents.':
    'Los agentes integrados son agentes preconfigurados que vienen con la plataforma. Muestran varias capacidades y pueden servir de inspiración para tus propios agentes personalizados.',

  // AgentRunPage
  'View and manage your past conversations':
    'Ver y gestionar tus conversaciones pasadas',
  'Loading agent and conversation…': 'Cargando agente y conversación…',
  Back: 'Atrás',
  'Conversation ID:': 'ID de conversación:',
  You: 'Tú',
  'Continue the conversation…': 'Continuar la conversación…',
  'Start chatting with {agentName}…': 'Comenzar a chatear con {agentName}…',
  'this agent': 'este agente',
  'System Prompt': 'Prompt del sistema',
  'No system prompt defined.': 'Ningún prompt del sistema definido.',

  // Artifacts side panel
  Artifacts: 'Artefactos',
  'No artifacts created yet': 'Aún no se han creado artefactos',

  // Task
  Requirements: 'Requisitos',
  'Task Timeline': 'Cronología de la tarea',
  'Active Agents': 'Agentes activos',

  // Background Image
  'Please select an image file': 'Por favor, selecciona un archivo de imagen',
  'Image file is too large. Please select a file smaller than {size}MB.':
    'El archivo de imagen es demasiado grande. Por favor, selecciona un archivo de menos de {size}MB.',
  'Background image updated': 'Imagen de fondo actualizada',
  'Failed to process image file': 'Error al procesar el archivo de imagen',
  'Please drop an image file': 'Por favor, suelta un archivo de imagen',
  'Drop your image here': 'Suelta tu imagen aquí',
  'Release to set as background': 'Suelta para establecer como fondo',
  'Background Image': 'Imagen de fondo',
  'Set a custom background image for the home page':
    'Establecer una imagen de fondo personalizada para la página de inicio',
  'Change Background': 'Cambiar fondo',
  'Upload Background': 'Subir fondo',
  'Background image removed': 'Imagen de fondo eliminada',
  'Make the platform your own': 'Personaliza la plataforma a tu imagen',
  Undo: 'Deshacer',
  'The URL does not point to a valid image':
    'La URL no apunta a una imagen válida',
  'Failed to load image from URL. Please check the URL and try again.':
    'Error al cargar la imagen desde la URL. Por favor, verifica la URL y vuelve a intentarlo.',
  'Please drop an image file or drag an image from a website':
    'Por favor, suelta un archivo de imagen o arrastra una imagen desde un sitio web',

  // About Page
  'AI Teams': 'Equipos de IA',
  'Multiple AI agents working together on complex tasks.':
    'Varios agentes de IA trabajando juntos en tareas complejas.',
  'LLM Independent': 'Independiente del LLM',
  'Works with OpenAI, Anthropic, Google Gemini, and more':
    'Funciona con OpenAI, Anthropic, Google Gemini y más',
  'Privacy First': 'Privacidad primero',
  'All data stays on your device. No servers, no tracking.':
    'Todos los datos permanecen en tu dispositivo. Sin servidores, sin seguimiento.',
  'Browser Native': 'Nativo del navegador',
  'Works entirely in your browser. No installation required.':
    'Funciona completamente en tu navegador. No se requiere instalación.',
  'Offline Ready': 'Listo sin conexión',
  'Works without internet after initial load.':
    'Funciona sin conexión después de la carga inicial.',
  'Open Source': 'Código abierto',
  '{license} licensed. Built by the community, for the community.':
    'Licenciado bajo {license}. Construido por la comunidad, para la comunidad.',
  'Configure your LLM provider': 'Configura tu proveedor LLM',
  'Describe your task': 'Describe tu tarea',
  'Be as detailed as possible to get the best results':
    'Sé tan detallado como sea posible para obtener los mejores resultados',
  'Watch AI agents collaborate': 'Mira a los agentes de IA colaborar',
  'See how different agents work together to complete your task':
    'Mira cómo diferentes agentes trabajan juntos para completar tu tarea',
  'Guide when needed': 'Guía cuando sea necesario',
  'Provide feedback and guidance to the agents as they work':
    'Proporciona comentarios y orientación a los agentes mientras trabajan',
  'Our Vision': 'Nuestra visión',
  "Democratize AI agent delegation with a universally accessible, privacy-conscious, open-source solution that runs entirely in the browser. AI augmentation isn't a luxury for the few, but a fundamental tool available to all.":
    'DDemocratizar la delegación de agentes de IA con una solución universalmente accesible, consciente de la privacidad y de código abierto que funciona completamente en el navegador. La augmentación de IA no es un lujo para unos pocos, sino una herramienta fundamental disponible para todos.',
  'Key Features': 'Características clave',
  'Key Benefits': 'Beneficios clave',
  'How It Works': 'Cómo funciona',
  FAQ: 'FAQ',
  'Is my data private?': '¿Mis datos son privados?',
  'Yes! All data processing happens locally in your browser. We do not collect or store any of your data.':
    '¡Sí! Todo el procesamiento de datos ocurre localmente en tu navegador. No recopilamos ni almacenamos ninguno de tus datos.',
  'Which LLM providers are supported?':
    '¿Qué proveedores de LLM son compatibles?',
  'We support {llmList}, and any provider compatible with the OpenAI API spec.':
    'Soportamos {llmList}, y cualquier proveedor compatible con la especificación de la API de OpenAI.',
  'Do I need to install anything?': '¿Necesito instalar algo?',
  'No installation is required. The app runs entirely in your web browser.':
    'No se requiere instalación. La aplicación funciona completamente en tu navegador web.',
  'Is this open source?': '¿Es esto de código abierto?',
  'Yes! The project is open source and available on GitHub under the {license} license.':
    '¡Sí! El proyecto es de código abierto y está disponible en GitHub bajo la licencia {license}.',
  'View on GitHub': 'Ver en GitHub',

  // Tasks Page
  'Manage and monitor tasks for your organization':
    'Gestiona y supervisa las tareas de tu organización',
  'Loading tasks…': 'Cargando tareas…',
  tasks: 'tareas',
  'In Progress': 'En progreso',

  // Task Page
  'Task Details': 'DDetalles de la tarea',
  'Task Created': 'Tarea creada',
  'Agent Assigned': 'Agente asignado',
  'Artifact Created': 'Artefacto creado',
  'User Message': 'Mensaje del usuario',
  'Agent Response': 'Respuesta del agente',
  'Requirement Satisfied': 'Requisito satisfecho',
  'Task Completed': 'Tarea completada',
  'Task Branched': 'Tarea dividida',
  'Sub-task Created': 'Sub-tarea creada',
  'Sub-task Completed': 'Sub-tarea completada',
  'Requirement Detected': 'Requisito detectado',
  'Requirement Validated': 'Requisito validado',
  'Task Started': 'Tarea iniciada',
  'All requirements satisfied': 'Todos los requisitos satisfechos',
  'No task ID provided': 'No se proporcionó ID de tarea',
  'Task not found': 'Tarea no encontrada',
  'Failed to load task data': 'Error al cargar los datos de la tarea',
  'View Content': 'Ver contenido',
  'Loading task details…': 'Cargando detalles de la tarea…',
  'Task Not Found': 'Tarea no encontrada',
  'The requested task could not be found.':
    'La tarea solicitada no se pudo encontrar.',
  'Task Steps': 'Pasos de la tarea',
  'Validation Criteria': 'Criterios de validación',

  // SubTaskTree Component
  'Task Hierarchy': 'Jerarquía de tareas',
  'Expand All': 'Expandir todo',
  'Collapse All': 'Colapsar todo',
  'Parent Task': 'Tarea padre',
  'Sibling Tasks': 'Tareas hermanas',
  'Current Task & Sub-tasks': 'Tarea actual y sub-tareas',
  'Main Task & Sub-tasks': 'Tarea principal y sub-tareas',
  'Task Dependencies': 'Dependencias de la tarea',
  'Total Sub-tasks': 'Total de sub-tareas',

  // Common actions
  Retry: 'Reintentar',
  Refresh: 'Actualizar',
  Close: 'Cerrar',
  Edit: 'Editar',
  Delete: 'Eliminar',
  Save: 'Guardar',
  Remove: 'Eliminar',
  Cancel: 'Cancelar',
  Export: 'Exportar',
  'Copy to clipboard': 'Copiar al portapapeles',

  // Database Administration
  'Loading database information…': 'Cargando información de la base de datos…',
  'Failed to load database information':
    'Error al cargar la información de la base de datos',
  'Database Administration': 'Administración de la base de datos',
  'Reset Database': 'Restablecer la base de datos',
  '{n} records': '{n} registros',
  Records: 'Registros',
  Indexes: 'Índices',
  Size: 'Tamaño',
  'Search {store} by {categories}…': 'Buscar {store} por {categories}…',
  'All Records': 'Todos los registros',
  'Filtered Records': 'Registros filtrados',
  ID: 'ID',
  Preview: 'Vista previa',
  Actions: 'Acciones',
  View: 'Ver',
  'No data recorded': 'No se registraron datos',
  'Record Details': 'Detalles del registro',

  // Searchable collections & indexes
  agents: 'agentes',
  conversations: 'conversaciones',
  knowledgeItems: 'conocimientos',
  folderWatchers: 'monitores de carpetas',
  credentials: 'credenciales',
  artifacts: 'artefactos',
  // tasks: 'tareas',
  contexts: 'contextos',
  langfuse_config: 'config langfuse',
  id: 'ID',
  name: 'nombre',
  description: 'descripción',
  role: 'rol',
  tags: 'etiquetas',
  size: 'tamaño',
  type: 'tipo',
  createdAt: 'fecha de creación',
  fileType: 'tipo de archivo',
  content: 'contenido',
  contentHash: 'hash del contenido',
  path: 'ruta',
  provider: 'proveedor',
  model: 'modelo',
  encryptedApiKey: 'clave API cifrada',
  baseUrl: 'URL base',
  timestamp: 'marca de tiempo',
  order: 'orden',
  mimeType: 'tipo MIME',
  lastModified: 'última modificación',
  syncSource: 'fuente de sincronización',
  lastSyncCheck: 'última verificación de sincronización',

  // Sharing
  'Share the platform': 'Compartir la plataforma',
  'Export the platform settings to another device or share it with others':
    'Exportar los parámetros de la plataforma a otro dispositivo o compartirlos con otros',
  'Export your current agents and LLM provider settings and share it via URL or QR code.':
    'Exportar sus agentes actuales y los parámetros del proveedor LLM y compartirlos a través de URL o código QR.',
  'Include my {n} agents': 'Incluir mis {n} agentes',
  'Now you can share the platform configuration…':
    'Ahora puede compartir la configuración de la plataforma…',
  'Either with this URL:': 'Con esta URL:',
  'Or this QR Code:': 'O este código QR:',
  'QR code generation failed. You can still use the URL above.':
    'Error al generar el código QR. Aún puede usar la URL anterior.',
  'Platform Preparation': 'Preparación de la plataforma',
  'Password (optional)': 'Contraseña (opcional)',
  Password: 'Contraseña',
  Continue: 'Continuar',
  'Setting the platform up…': 'Configurando la plataforma…',

  // Local LLM Loading Indicator
  'Initializing Local AI Model…': 'Inicializando el modelo de IA local…',
} as const
