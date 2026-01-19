import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  // Page titles
  Marketplace: 'Marketplace',
  'Expand your platform capabilities with community extensions':
    'Expande las capacidades de tu plataforma con extensiones de la comunidad',
  'Find and install apps, agents, connectors, and tools from the community':
    'Encuentra e instala aplicaciones, agentes, conectores y herramientas de la comunidad',

  // Tabs
  All: 'Todos',
  Apps: 'Aplicaciones',
  Agents: 'Agentes',
  Connectors: 'Conectores',
  Tools: 'Herramientas',
  Installed: 'Instalados',
  Available: 'Disponibles',

  // Search
  'Search extensions...': 'Buscar extensiones...',
  'No description found': 'No se encontró descripción',
  'Try a different search term': 'Intenta con otro término de búsqueda',

  // Categories
  Categories: 'Categorías',
  Productivity: 'Productividad',
  Development: 'Desarrollo',
  Communication: 'Comunicación',
  'Data & Analytics': 'Datos y Analítica',
  'AI & Machine Learning': 'IA y Machine Learning',
  Utilities: 'Utilidades',

  // Filters
  Filter: 'Filtrar',
  'Sort by': 'Ordenar por',
  'Most popular': 'Más populares',
  'Recently updated': 'Actualizados recientemente',
  'Highest rated': 'Mejor valorados',
  Newest: 'Más recientes',
  Alphabetical: 'Alfabético',

  // Extension Card
  Install: 'Instalar',
  'Update available': 'Actualización disponible',
  Update: 'Actualizar',
  Uninstall: 'Desinstalar',
  Configure: 'Configurar',
  Enable: 'Activar',
  Disable: 'Desactivar',
  Verified: 'Verificado',
  Official: 'Oficial',
  Community: 'Comunidad',
  '{n} downloads': '{n} descargas',
  '{n} reviews': '{n} reseñas',
  Free: 'Gratis',
  Premium: 'Premium',

  // Extension Detail
  Overview: 'Descripción',
  Reviews: 'Reseñas',
  Changelog: 'Changelog',
  Documentation: 'Documentación',
  'Version {v}': 'Versión {v}',
  'Last updated': 'Última actualización',
  Author: 'Autor',
  License: 'Licencia',
  Website: 'Sitio web',
  'Report issue': 'Reportar problema',
  'View source': 'Ver código fuente',
  Permissions: 'Permisos',
  'This extension requires:': 'Esta extensión requiere:',
  Dependencies: 'Dependencias',
  'Requires these extensions:': 'Requiere estas extensiones:',
  Screenshots: 'Capturas de pantalla',
  'Similar extensions': 'Extensiones similares',

  // Reviews
  'Write a review': 'Escribir una reseña',
  Rating: 'Calificación',
  'Your review': 'Tu reseña',
  'Submit review': 'Enviar reseña',
  Helpful: 'Útil',
  '{n} people found this helpful': '{n} personas encontraron esto útil',
  'Report review': 'Reportar reseña',

  // Install flow
  'Installing...': 'Instalando...',
  'Installation complete': 'Instalación completada',
  'Installation failed': 'Instalación fallida',
  'This extension requires the following permissions:':
    'Esta extensión requiere los siguientes permisos:',
  Allow: 'Permitir',
  Deny: 'Denegar',
  Cancel: 'Cancelar',
  'Confirm installation': 'Confirmar instalación',

  // Publish
  'Publish Extension': 'Publicar extensión',
  'Share your extension with the community':
    'Comparte tu extensión con la comunidad',
  'Create New Extension': 'Crear nueva extensión',
  'Upload Extension': 'Subir extensión',
  'Upload a .yaml or .devs file': 'Sube un archivo .yaml o .devs',
  'Drop your extension file here': 'Suelta tu archivo de extensión aquí',
  'Or browse files': 'O navegar archivos',
  Validate: 'Validar',
  'Validating...': 'Validando...',
  'Validation successful': 'Validación exitosa',
  'Validation failed': 'Validación fallida',
  'Fix the following issues:': 'Corrige los siguientes problemas:',
  Publish: 'Publicar',
  'Publishing...': 'Publicando...',
  'Published successfully': 'Publicado exitosamente',
  'Publish failed': 'Publicación fallida',
  Draft: 'Borrador',
  Published: 'Publicado',
  'Under review': 'En revisión',
  Rejected: 'Rechazado',
  Edit: 'Editar',
  Delete: 'Eliminar',
  Unpublish: 'Despublicar',
  'View in marketplace': 'Ver en marketplace',

  // Empty states
  'No extensions found': 'No se encontraron extensiones',
  'Be the first to publish an extension!':
    '¡Sé el primero en publicar una extensión!',
  'No installed extensions': 'No hay extensiones instaladas',
  'Browse the marketplace to find useful extensions':
    'Explora el marketplace para encontrar extensiones útiles',
  'No apps available': 'No hay aplicaciones disponibles',
  'No agents available': 'No hay agentes disponibles',
  'No connectors available': 'No hay conectores disponibles',
  'No tools available': 'No hay herramientas disponibles',

  // Coming soon placeholder
  'Coming Soon': 'Próximamente',
  'The DEVS Marketplace is under development':
    'El DEVS Marketplace está en desarrollo',
  "Soon you'll be able to discover and install community-built apps, agents, connectors, and tools.":
    'Pronto podrás descubrir e instalar aplicaciones, agentes, conectores y herramientas creadas por la comunidad.',
  "Want to be notified when it's ready?":
    '¿Quieres ser notificado cuando esté listo?',
  'Join the waitlist': 'Unirse a la lista de espera',
  'Learn more about building extensions': 'Aprende más sobre crear extensiones',

  // Trust levels
  Unverified: 'No verificado',
  'This extension has been reviewed and verified by DEVS':
    'Esta extensión ha sido revisada y verificada por DEVS',
  'This extension is developed by the DEVS team':
    'Esta extensión es desarrollada por el equipo DEVS',
  'This extension has not been reviewed yet':
    'Esta extensión aún no ha sido revisada',
  'This extension is community-maintained':
    'Esta extensión es mantenida por la comunidad',

  // Translation Page
  Translation: 'Traducción',
  'Translate text using local AI': 'Traducir texto usando IA local',
  'Source Language': 'Idioma de origen',
  'Target Language': 'Idioma de destino',
  'Detected language: {lang}': 'Idioma detectado: {lang}',
  'Type more text to detect language...':
    'Escriba más texto para detectar el idioma...',
  'Swap languages': 'Intercambiar idiomas',
  'Enter text to translate': 'Ingrese el texto a traducir',
  'Type or paste text here...': 'Escriba o pegue el texto aquí...',
  'Translation will appear here...': 'La traducción aparecerá aquí...',
  'Copy translation': 'Copiar traducción',
  Translate: 'Traducir',
  'Translating...': 'Traduciendo...',
  Clear: 'Limpiar',
  'Translation failed. Please try again.':
    'La traducción falló. Por favor, inténtelo de nuevo.',

  // Extension Detail Modal
  'Extension type': 'Tipo de extensión',
  Copy: 'Copiar',
  'Open in new tab': 'Abrir en nueva pestaña',
  'Privacy Policy': 'Política de Privacidad',

  // Hero Banner
  'Supercharge your AI workflows': 'Potencia tus flujos de trabajo de IA',
  'One-click install': 'Instalación con un clic',
  'Community-driven': 'Impulsado por la comunidad',
  '100% open source': '100% código abierto',
  'Build my own extension': 'Crea tu propia extensión',

  // New Extension Page
  'Create Extension': 'Crear extensión',
  'Generate a custom extension using AI':
    'Genera una extensión personalizada usando IA',
  'Back to Marketplace': 'Volver al Marketplace',
  'Build with AI': 'Construir con IA',
  'Describe what you want to create and let AI generate a fully functional extension for you.':
    'Describe lo que quieres crear y deja que la IA genere una extensión completamente funcional para ti.',
  'Step 1': 'Paso 1',
  'Step 2': 'Paso 2',
  'Choose extension type': 'Elige el tipo de extensión',
  'Describe your extension': 'Describe tu extensión',
  App: 'Aplicación',
  'Full UI applications with interactive pages':
    'Aplicaciones con interfaz completa y páginas interactivas',
  'A pomodoro timer app, a habit tracker, a mood journal with charts':
    'Una app de temporizador pomodoro, un rastreador de hábitos, un diario de ánimo con gráficos',
  Agent: 'Agente',
  'AI agents with specialized instructions and personality':
    'Agentes de IA con instrucciones especializadas y personalidad',
  'A code reviewer agent, a writing coach, a data analysis specialist':
    'Un agente revisor de código, un coach de escritura, un especialista en análisis de datos',
  Connector: 'Conector',
  'Integrations with external services and APIs':
    'Integraciones con servicios externos y APIs',
  'A GitHub integration, a Slack connector, a weather data provider':
    'Una integración con GitHub, un conector de Slack, un proveedor de datos meteorológicos',
  Tool: 'Herramienta',
  'Utility functions that agents can use':
    'Funciones utilitarias que los agentes pueden usar',
  'A URL shortener, a JSON formatter, a unit converter, a calculator':
    'Un acortador de URLs, un formateador JSON, un conversor de unidades, una calculadora',
  Examples: 'Ejemplos',
  'Describe what your extension should do, its features, and how it should look...':
    'Describe qué debe hacer tu extensión, sus características y cómo debe verse...',
  'Tips for better results': 'Consejos para mejores resultados',
  'Be specific about the features you want':
    'Sé específico sobre las características que deseas',
  'Mention any UI preferences (colors, layout)':
    'Menciona preferencias de interfaz (colores, diseño)',
  'Include example use cases': 'Incluye ejemplos de casos de uso',
  'Describe the target users': 'Describe los usuarios objetivo',
  'Please provide a description for your extension':
    'Por favor proporciona una descripción para tu extensión',
  'Failed to generate extension': 'Error al generar la extensión',
  'Extension created successfully!': '¡Extensión creada exitosamente!',
  'Generate Extension': 'Generar extensión',
  'Generating...': 'Generando...',
  'Creating your extension...': 'Creando tu extensión...',
  'This may take a few seconds': 'Esto puede tardar unos segundos',

  // Custom Extensions
  Custom: 'Personalizada',
  'AI-generated': 'Generada por IA',
  'My extensions': 'Mis extensiones',

  // Extension Editor Page
  'Edit and refine your extension': 'Edita y mejora tu extensión',
  'Extension not found': 'Extensión no encontrada',
  'Editor tabs': 'Pestañas del editor',
  Preview: 'Vista previa',
  Code: 'Código',
  Chat: 'Chat',
  Save: 'Guardar',
  Done: 'Listo',
  Unsaved: 'Sin guardar',
  'Extension saved': 'Extensión guardada',
  'Failed to save extension': 'Error al guardar la extensión',
  'Failed to load extension': 'Error al cargar la extensión',
  'You have unsaved changes. Save before leaving?':
    '¿Tienes cambios sin guardar. ¿Guardar antes de salir?',
  "Your extension has been created! You can preview it, edit the code directly, or describe changes you'd like me to make.":
    '¡Tu extensión ha sido creada! Puedes previsualizarla, editar el código directamente o describir los cambios que quieres que haga.',
  "Describe changes you'd like to make":
    'Describe los cambios que quieres hacer',
  'The AI will help you refine your extension':
    'La IA te ayudará a mejorar tu extensión',
  "Describe what you'd like to change...": 'Describe lo que quieres cambiar...',
  Send: 'Enviar',
  'AI-suggested code changes are automatically applied':
    'Los cambios de código sugeridos por la IA se aplican automáticamente',
  'No LLM provider configured': 'No hay proveedor de LLM configurado',
  'Unknown error': 'Error desconocido',
  'Sorry, I encountered an error: {error}':
    'Lo siento, encontré un error: {error}',
  'Code applied successfully!': '¡Código aplicado con éxito!',
  'Code changes applied': 'Cambios de código aplicados',
  'Sorry, I encountered an error parsing the code changes.':
    'Lo siento, encontré un error al analizar los cambios de código.',

  // Delete extension
  'Delete extension': 'Eliminar extensión',
  'Are you sure you want to delete this extension?':
    '¿Estás seguro de que quieres eliminar esta extensión?',
  'This action cannot be undone.': 'Esta acción no se puede deshacer.',

  // Duplicate extension
  'Duplicate & edit': 'Duplicar y editar',

  // Manual creation
  'or create manually': 'o crear manualmente',
}
