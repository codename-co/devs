import type { I18n } from '@/i18n/locales'

export const es: I18n = {
  // AgentPicker
  'Available Agents': 'Agentes disponibles',
  Scientists: 'Científicos',
  Advisors: 'Asesores',
  Artists: 'Artistas',
  Philosophers: 'Filósofos',
  Musicians: 'Músicos',
  Developers: 'Desarrolladores',
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
  'Create and manage your AI specialists':
    'Crea y gestiona tus especialistas en IA',
  Methodologies: 'Metodologías',
  Conversations: 'Conversaciones',
  'Conversations history': 'Historial de conversaciones',
  'Search conversations': 'Buscar conversaciones',
  'Pin conversation': 'Fijar conversación',
  'Unpin conversation': 'Desfijar conversación',
  'Summarize conversation': 'RResumir conversación',
  'Pin it': 'Fijar',
  'Unpin it': 'Desfijar',
  Pinned: 'Fijadas',
  'Message description': 'Descripción del mensaje',
  'Edit description': 'Editar descripción',
  'View full conversation': 'Ver conversación completa',
  'Generating description...': 'Generando descripción...',
  'Generating summary...': 'Generando resumen...',
  'No pinned messages yet': 'Aún no hay mensajes fijados',
  'Show pinned only': 'Mostrar solo fijados',
  'Pinned conversations': 'Conversaciones fijadas',
  'All conversations': 'Todas las conversaciones',
  'Pinned only': 'Solo fijadas',
  'Filter conversations': 'Filtrar conversaciones',
  Knowledge: 'Conocimientos',
  Connectors: 'Conectores',
  'Add connectors': 'Agregar conectores',
  'New chat': 'Nuevo intercambio',
  AGENTS: 'AGENTES',
  CONVERSATIONS: 'CONVERSACIONES',
  'View all agents': 'Ver todos los agentes',
  'View all history': 'Ver todo el historial',
  Chat: 'Chat',
  'Main navigation': 'Navegación principal',
  'New Agent': 'Nuevo agente',
  'New Methodology': 'Nueva metodología',
  'Upgrade to Pro': 'Actualizar a Pro',
  'Quick Actions': 'Acciones rápidas',
  'Toggle Theme': 'Cambiar tema',
  Theme: 'Tema',
  System: 'Sistema',
  Light: 'Claro',
  Dark: 'Oscuro',
  About: 'Acerca de',
  Language: 'Idioma',
  More: 'Más',
  Privacy: 'Privacidad',
  Terms: 'Términos',

  // PromptArea
  'Need something done?': '¿Necesitas que se haga algo?',
  'More actions': 'Más acciones',
  'Attach a file or image': 'Adjuntar un archivo o imagen',
  'Upload new file': 'Subir nuevo archivo',
  'Choose from knowledge base': 'Elegir de la base de conocimientos',
  'No files found in knowledge base':
    'No se encontraron archivos en la base de conocimientos',
  'Drop files here…': 'Suelta archivos aquí…',
  'Speak to microphone': 'Hablar al micrófono',
  'Send prompt': 'Enviar prompt',
  'Select an agent': 'Seleccionar un agente',
  'No agents found': 'No se encontraron agentes',
  'Select a methodology': 'Seleccionar una metodología',
  'No methodologies found': 'No se encontraron metodologías',
  Sequential: 'Secuencial',
  Parallel: 'Paralelo',
  'Event-Driven': 'Basado en eventos',
  Iterative: 'Iterativo',
  Hierarchical: 'Jerárquico',
  'Time-Boxed': 'Tiempo limitado',
  Hybrid: 'Híbrido',
  'Select a model': 'Seleccionar un modelo',
  'Add a model': 'Agregar un modelo',

  // Service worker
  'New features are waiting': 'Nuevas funciones te están esperando',
  '{product} v{version} is ready to be installed.':
    '{product} v{version} está listo para ser instalado.',
  Upgrade: 'Actualizar',

  // Page: /404
  'Page not found': 'Página no encontrada',

  // LLM Integration
  'No LLM provider configured. Please [configure one in Settings]({path}).':
    'Ningún proveedor de LLM configurado. Por favor, [configura uno en Configuraciones]({path}).',

  // MarkdownRenderer
  'Thinking…': 'Pensando…',
  Thoughts: 'Pensamientos',

  // AgentsPage
  'My Agents': 'Mis agentes',
  'Built-in Agents': 'Agentes integrados',
  'Built-in agents are pre-configured agents that come with the platform. They showcase various capabilities and can serve as inspiration for your own custom agents.':
    'Los agentes integrados son agentes preconfigurados que vienen con la plataforma. Muestran varias capacidades y pueden servir de inspiración para tus propios agentes personalizados.',
  'Default agents are currently hidden. You can enable them in':
    'Los agentes predeterminados están actualmente ocultos. Puedes habilitarlos en',

  // AgentRunPage
  'Find your past conversations': 'Encuentra tus conversaciones pasadas',
  'Loading agent and conversation…': 'Cargando agente y conversación…',
  Back: 'Atrás',
  'Conversation ID:': 'ID de conversación:',
  You: 'Tú',
  'Continue the conversation…': 'Continuar la conversación…',
  'Start chatting with {agentName}…': 'Comenzar a chatear con {agentName}…',
  'this agent': 'este agente',
  'System Prompt': 'Prompt del sistema',
  'No system prompt defined.': 'Ningún prompt del sistema definido.',
  Memories: 'Memorias',
  Global: 'Global',
  'No memories learned yet. Start conversations and use "Learn from conversation" to build agent memory.':
    'Aún no se han aprendido memorias. Inicia conversaciones y usa "Aprender de la conversación" para construir la memoria del agente.',
  'Make Global': 'Hacer global',
  'Remove Global': 'Quitar global',
  'Agent Context': 'Contexto del agente',

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
  'Methodology Selected': 'Metodología seleccionada',
  'Phase Started': 'Fase iniciada',
  'Phase Completed': 'Fase completada',
  'Team Built': 'Equipo formado',
  'Role Assigned': 'Rol asignado',
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
  Download: 'Descargar',

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

  // Agent Memory System
  'Agent Memory': 'Memoria del agente',
  'Review and manage what agents have learned':
    'Revisar y gestionar lo que los agentes han aprendido',
  'Select Agent': 'Seleccionar agente',
  'All agents': 'Todos los agentes',
  'Create Memory': 'Crear memoria',
  'Generate Synthesis': 'Generar síntesis',
  'Total Memories': 'Memorias totales',
  'Pending Review': 'Pendiente de revisión',
  'High Confidence': 'Alta confianza',
  'Low Confidence': 'Baja confianza',
  Approved: 'Aprobado',
  Synthesis: 'Síntesis',
  'No memories pending review': 'No hay memorias pendientes de revisión',
  'No memories pending review for this agent':
    'No hay memorias pendientes de revisión para este agente',
  'No approved memories yet': 'Aún no hay memorias aprobadas',
  'Select an agent to view their memory synthesis':
    'Selecciona un agente para ver su síntesis de memoria',
  'Memory Synthesis for {agent}': 'Síntesis de memoria para {agent}',
  'Last updated: {date}': 'Última actualización: {date}',
  'No synthesis generated yet': 'Aún no se ha generado síntesis',
  'Delete Memory': 'Eliminar memoria',
  'Are you sure you want to delete this memory? This action cannot be undone.':
    '¿Estás seguro de que quieres eliminar esta memoria? Esta acción no se puede deshacer.',
  Facts: 'Hechos',
  Preferences: 'Preferencias',
  Behaviors: 'Comportamientos',
  'Domain Knowledge': 'Conocimiento del dominio',
  Relationships: 'Relaciones',
  Procedures: 'Procedimientos',
  Corrections: 'Correcciones',
  'All Categories': 'Todas las categorías',
  'Filter by category': 'Filtrar por categoría',
  high: 'alta',
  medium: 'media',
  low: 'baja',
  High: 'Alta',
  Medium: 'Media',
  Low: 'Baja',
  'Confidence level: {level}': 'Nivel de confianza: {level}',
  'Auto-approved': 'Aprobado automáticamente',
  'Review notes (optional)': 'Notas de revisión (opcional)',
  'Add notes about this memory...': 'Añadir notas sobre esta memoria...',
  Forget: 'Olvidar',
  Memorize: 'Memorizar',
  'Edit Memory': 'Editar memoria',
  'Memory content': 'Contenido de la memoria',
  'Explain your changes...': 'Explica tus cambios...',
  'Save & Approve': 'Guardar y aprobar',
  'Select All': 'Seleccionar todo',
  'Deselect All': 'Deseleccionar todo',
  '{count} selected': '{count} seleccionados',
  'Reject Selected': 'Rechazar seleccionados',
  'Approve Selected': 'Aprobar seleccionados',
  'Learned: {date}': 'Aprendido: {date}',
  'Used {count} times': 'Usado {count} veces',
  'Memory approved': 'Memoria aprobada',
  'Memory rejected': 'Memoria rechazada',
  'Memory edited and approved': 'Memoria editada y aprobada',
  'Memory deleted': 'Memoria eliminada',
  'Learn from conversation': 'Aprender de la conversación',
  'Learning...': 'Aprendiendo...',
  'Memory learning failed': 'Error en el aprendizaje de memoria',
  'New memories learned': 'Nuevas memorias aprendidas',
  Insight: 'Perspicacia',
  'Review and approve to save': 'Revisar y aprobar para guardar',
  Dismiss: 'Descartar',
  Fact: 'Hecho',
  Preference: 'Preferencia',
  Behavior: 'Comportamiento',
  Relationship: 'Relación',
  Procedure: 'Procedimiento',
  Correction: 'Corrección',
  Title: 'Título',
  Content: 'Contenido',
  Category: 'Categoría',
  Confidence: 'Confianza',
  Keywords: 'Palabras clave',
  'Comma-separated list of keywords':
    'Lista de palabras clave separadas por comas',

  // Pinned Messages
  'Pin message': 'Fijar mensaje',
  'Unpin message': 'Desfijar mensaje',
  'Message pinned successfully': 'Mensaje fijado con éxito',
  'Copy the answer': 'Copiar la respuesta',
  'Answer copied to clipboard': 'Respuesta copiada al portapapeles',
  'Add a description to help you remember why this message is important.':
    'Agrega una descripción para ayudarte a recordar por qué este mensaje es importante.',
  Description: 'Descripción',
  'Brief description of why this is important...':
    'Breve descripción de por qué esto es importante...',
  'Pinned Messages': 'Mensajes fijados',
  'No pinned messages': 'No hay mensajes fijados',
  'Messages you pin will appear here for quick reference.':
    'Los mensajes que fijas aparecerán aquí para una referencia rápida.',
  'View conversation': 'Ver conversación',
  'From conversation with {agentName}': 'De la conversación con {agentName}',
  'Filter by agent': 'Filtrar por agente',
  'No pinned conversations': 'No hay conversaciones fijadas',
  'No conversations found': 'No se encontraron conversaciones',
  'View summary': 'Ver resumen',
  'No summary available': 'No hay resumen disponible',
  'Rename conversation': 'Renombrar conversación',
  'Conversation title': 'Título de la conversación',
  'Enter a new title': 'Ingresa un nuevo título',
  'Conversation renamed successfully': 'Conversación renombrada con éxito',
  'No pinned messages yet. Pin important messages from conversations to make them available here.':
    'Aún no hay mensajes fijados. Fija mensajes importantes de las conversaciones para que estén disponibles aquí.',

  // Knowledge Base - Folder Watching
  'Stop syncing': 'Detener sincronización',
  Reconnect: 'Reconectar',
  'Grant Access': 'Conceder acceso',
  Disconnected: 'Desconectado',
  'Last sync: {time}': 'Última sincronización: {time}',

  // Memory Learning
  'Learn from this message': 'Aprender de este mensaje',
  '{count} insights extracted': '{count} insights extraídos',
  'No new insights found in this message':
    'No se encontraron nuevos insights en este mensaje',

  // Agent Management
  'Edit Knowledge': 'Editar conocimiento',
  'Edit Knowledge for {name}': 'Editar conocimiento para {name}',
  'Save Changes': 'Guardar cambios',
  'Delete Agent': 'Eliminar agente',
  'Are you sure you want to delete "{name}"? This action cannot be undone.':
    '¿Está seguro de que desea eliminar "{name}"? Esta acción no se puede deshacer.',

  // Sync Status Indicator
  'Sync status': 'Estado de sincronización',
  'Synced with {count} peer(s)': 'Sincronizado con {count} par(es)',
  'Synced, waiting for peers': 'Sincronizado, esperando pares',
  'Connecting...': 'Conectando...',
  'Sync error': 'Error de sincronización',
  Room: 'Sala',
  'Last sync': 'Última sincronización',
  'Manage sync in Settings': 'Administrar sincronización en Configuración',

  // Identity & State
  Guest: 'Invitado',
  Synchronization: 'Modo de sincronización',
  Sync: 'Modo',
  Syncing: 'Sincronizando',
  Offline: 'Sin conexión',
} as const
