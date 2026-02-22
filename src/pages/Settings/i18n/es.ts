import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  'Platform Settings': 'Configuración de la plataforma',
  'Configure AI providers, models and platform defaults for your organization':
    'Configurar proveedores de LLM, modelos y valores predeterminados de la plataforma para su organización',
  Appearance: 'Apariencia',
  'Choose your preferred language': 'Elija su idioma preferido',
  'Interface Language': 'Idioma de la interfaz',
  'Platform Name': 'Nombre de la plataforma',
  'Secure Storage': 'Almacenamiento seguro',
  'Manage your encryption keys and secure storage':
    'Gestionar sus claves de cifrado y almacenamiento seguro',
  'Master Key': 'Clave maestra',
  'Master key copied to clipboard': 'Clave maestra copiada al portapapeles',
  'Failed to copy master key': 'Error al copiar la clave maestra',
  'Regenerate Master Key': 'Regenerar la clave maestra',
  'Are you sure you want to regenerate the master key? This will invalidate all existing encrypted data.':
    '¿Está seguro de que desea regenerar la clave maestra? Esto invalidará todos los datos cifrados existentes.',
  'Master key regenerated successfully': 'Clave maestra regenerada con éxito',
  'Failed to regenerate master key': 'Error al regenerar la clave maestra',
  'Your master key is used to encrypt all sensitive data stored locally. Keep it safe and secure.':
    'Su clave maestra se utiliza para cifrar todos los datos sensibles almacenados localmente. Mantenla segura.',
  'AI Providers': 'Proveedores de LLM',
  'Choose your AI provider, manage your API credentials':
    'Elija su proveedor de LLM, gestione sus credenciales de API',
  'Add Provider': 'Agregar proveedor',
  'No providers configured. Add one to get started.':
    'No hay proveedores configurados. Agregue uno para comenzar.',
  'Set as Default': 'Establecer como predeterminado',
  'Secure storage is locked': 'El almacenamiento seguro está bloqueado',
  'Enter your master password to unlock':
    'Ingrese su contraseña maestra para desbloquear',
  'Master password': 'Contraseña maestra',
  Unlock: 'Desbloquear',
  'Storage unlocked': 'Almacenamiento desbloqueado',
  'Invalid password': 'Contraseña inválida',
  'Please fill in all required fields':
    'Por favor, complete todos los campos obligatorios',
  'Invalid API key': 'Clave API inválida',
  'Credential added successfully': 'Credenciales agregadas con éxito',
  'Failed to add credential': 'Error al agregar credenciales',
  'Credential deleted': 'Credenciales eliminadas',
  'Failed to delete credential': 'Error al eliminar credenciales',
  'Database Management': 'Gestión de base de datos',
  'Export, import, or clear your local database':
    'Exportar, importar o borrar su base de datos local',
  'Clear database': 'Borrar base de datos',
  'Are you sure you want to clear all data? This action cannot be undone.':
    '¿Está seguro de que desea borrar todos los datos? Esta acción no se puede deshacer.',
  'Database cleared successfully': 'Base de datos borrada con éxito',
  'Failed to clear database': 'Error al borrar la base de datos',
  'Database repaired successfully': 'Base de datos reparada con éxito',
  'Failed to repair database': 'Error al reparar la base de datos',
  Created: 'Creado',
  Updated: 'Actualizado',
  'Add LLM Provider': 'Agregar proveedor LLM',
  'Select Provider': 'Seleccionar proveedor',
  'Server URL (Optional)': 'URL del servidor (Opcional)',
  'API Key': 'Clave API',
  'Enter your API key': 'Ingrese su clave API',
  'Format:': 'Formato:',
  'Base URL': 'URL base',
  Model: 'Modelo',
  'Select a model': 'Seleccionar un modelo',
  'Custom Model Name': 'Nombre de modelo personalizado',
  'Enter model name': 'Ingrese el nombre del modelo',
  'Validate & Add': 'Validar y agregar',
  'Fetch Available Models': 'Obtener modelos disponibles',
  'Use Fetched Models': 'Utilizar modelos recuperados',
  'Manual Input': 'Entrada manual',
  'Model Name': 'Nombre del modelo',
  'Enter the exact name of the model you want to use':
    'Ingrese el nombre exacto del modelo que desea utilizar',
  'Available Models': 'Modelos disponibles',
  'Default Provider': 'Proveedor predeterminado',
  'Provider set as default': 'Proveedor establecido como predeterminado',
  'Advanced Settings': 'Configuración avanzada',
  '{files} files cached ({size})': '{files} archivos en caché ({size})',
  'Local models cache': 'Caché de modelos locales',
  'Clear cache': 'Borrar caché',
  'Downloaded models are cached for 1 year to avoid re-downloading.':
    'Los modelos descargados se almacenan en caché durante 1 año para evitar la re-descarga.',
  'Local LLMs run entirely in your browser':
    'Los LLM locales se ejecutan completamente en su navegador.',
  'No data is sent to external servers. Download happens at first use.':
    'No se envían datos a servidores externos. La descarga ocurre en el primer uso.',
  'Requirements:': 'Requisitos:',
  'WebGPU support': 'Soporte WebGPU',
  'At least 8GB of RAM': 'Al menos 8 GB de RAM',
  'Storage space for model files (2-4GB)':
    'Espacio de almacenamiento para los archivos del modelo (2-4 GB)',
  'Your device:': 'Su dispositivo:',
  'WebGPU:': 'WebGPU:',
  'Brand: {brand}': 'Marca: {brand}',
  'Model: {model}': 'Modelo: {model}',
  'Memory: {memory} or more (imprecise)': 'Memoria: {memory} o más (impreciso)',
  'Vendor: {vendor}': 'Proveedor: {vendor}',
  'Browser: {browser}': 'Navegador: {browser}',
  'Enable Speech-to-Text': 'Habilitar voz a texto',
  'Allow voice input using your device microphone in the prompt area':
    'Permitir entrada de voz usando el micrófono de su dispositivo en el área de prompt',
  'Hide Default Agents': 'Ocultar agentes predeterminados',
  'Only show your custom agents in the agent picker and agents page':
    'Mostrar solo sus agentes personalizados en el selector de agentes y la página de agentes',
  Features: 'Funciones',
  Voice: 'Voz',
  'Configure how you interact with agents':
    'Configure cómo interactúa con los agentes',
  'Auto Memory Learning': 'Aprendizaje automático de memoria',
  'Automatically extract learnable information from conversations to build agent memory':
    'Extraer automáticamente información aprendible de las conversaciones para construir la memoria del agente',
  'Quick Reply Suggestions': 'Sugerencias de respuesta rápida',
  'Show AI-generated follow-up suggestions after each assistant response':
    'Mostrar sugerencias de seguimiento generadas por IA después de cada respuesta del asistente',
  'Web Search Grounding': 'Búsqueda web integrada',
  'Allow AI models to search the web for up-to-date information (supported by Google Gemini and Anthropic Claude)':
    'Permitir que los modelos de IA busquen información actualizada en la web (compatible con Google Gemini y Anthropic Claude)',
  'Global System Instructions': 'Instrucciones globales del sistema',
  "These instructions will be prepended to every agent's instructions":
    'Estas instrucciones se añadirán al inicio de las instrucciones de cada agente',
  'Enter global instructions that apply to all agents...':
    'Ingrese instrucciones globales que apliquen a todos los agentes...',
  'Show Context Panel': 'Mostrar panel de contexto',
  'Display the contextual information panel on the right side of the screen':
    'Mostrar el panel de información contextual en el lado derecho de la pantalla',
  'Make the platform your own': 'Personalice la plataforma',
  'Share the platform': 'Compartir la plataforma',
  'Export the platform settings to another device or share it with others':
    'Exporte la configuración de la plataforma a otro dispositivo o compártala con otros',
  'Sync your data across devices using peer-to-peer connection':
    'Sincronice sus datos entre dispositivos mediante conexión punto a punto',
  'Server URL': 'URL del servidor',
  'URL of your Ollama server': 'URL de su servidor Ollama',
  'Get your API key from': 'Obtenga su clave API de',
  'Enter model name manually': 'Introducir nombre del modelo manualmente',
  'Fetching available models...': 'Obteniendo modelos disponibles...',
  'Enter the model name manually':
    'Introduzca el nombre del modelo manualmente',
  'models available': 'modelos disponibles',
  'This provider is already configured': 'Este proveedor ya está configurado',
  Computer: 'Ordenador',
  'Sandbox runtimes and system resources':
    'Runtimes sandbox y recursos del sistema',
  'Sandbox Runtimes': 'Runtimes Sandbox',
  Running: 'En ejecución',
  Executing: 'Ejecutando',
  Loading: 'Cargando',
  Idle: 'Inactivo',
  Error: 'Error',
  Start: 'Iniciar',
  Stop: 'Detener',
  'Pre-load the {runtime} runtime': 'Precargar el runtime de {runtime}',
  'Terminate the {runtime} runtime': 'Terminar el runtime de {runtime}',
  'Run a test snippet in the {runtime} sandbox':
    'Ejecutar un fragmento de prueba en el sandbox {runtime}',
  Try: 'Probar',
  'Isolated code execution environments running entirely in WebAssembly. Python uses a Web Worker; JavaScript runs in a lightweight QuickJS VM.':
    'Entornos de ejecución de código aislados que funcionan enteramente en WebAssembly. Python usa un Web Worker; JavaScript se ejecuta en una VM QuickJS ligera.',
  CPU: 'CPU',
  '{used} / {total} cores': '{used} / {total} núcleos',
  'CPU usage': 'Uso de CPU',
  Memory: 'Memoria',
  'Memory usage': 'Uso de memoria',
  Storage: 'Almacenamiento',
  'Storage usage': 'Uso de almacenamiento',
  'Device Information': 'Información del dispositivo',
  Device: 'Dispositivo',
  'GPU Vendor': 'Fabricante GPU',
  'GPU Renderer': 'Renderizador GPU',
  WebGPU: 'WebGPU',
  Supported: 'Soportado',
  'Not Supported': 'No soportado',
  'Local LLM (Browser)': 'LLM local (navegador)',
  'Runs AI models entirely in your browser using WebGPU. No data is sent to external servers.':
    'Ejecuta modelos de IA completamente en su navegador usando WebGPU. No se envían datos a servidores externos.',
  'Default Model': 'Modelo predeterminado',
  'Loaded Model': 'Modelo cargado',
  'No model loaded': 'Ningún modelo cargado',
  Unload: 'Descargar',
  'Unload model to free memory': 'Descargar modelo para liberar memoria',
  'WebGPU is not supported on this device. Local LLM inference requires a WebGPU-compatible browser.':
    'WebGPU no es compatible con este dispositivo. La inferencia LLM local requiere un navegador compatible con WebGPU.',
  'Your device has less than 8GB of RAM. Local inference may be slow or unavailable for larger models.':
    'Su dispositivo tiene menos de 8 GB de RAM. La inferencia local puede ser lenta o no estar disponible para modelos más grandes.',

  'System Resources': 'Recursos del sistema',
  Skills: 'Habilidades',
  'Discover, install, and manage specialized skills for your agents':
    'Descubre, instala y gestiona habilidades especializadas para tus agentes',
  'Agent Memory': 'Memoria de agentes',
  'Pinned Messages': 'Mensajes fijados',
  General: 'General',
  Extend: 'Ampliar',
  Monitor: 'Monitorear',
  Configure: 'Configurar',
  Personalize: 'Personalizar',
  Observe: 'Observar',
  'How to connect': 'Cómo conectarse',
  'Open {provider}': 'Abrir {provider}',
  "Sign in or create an account on the provider's website.":
    'Inicie sesión o cree una cuenta en el sitio web del proveedor.',
  'Create a new API key in your account dashboard.':
    'Cree una nueva clave API en el panel de su cuenta.',
  'Copy the key and come back here to paste it below.':
    'Copie la clave y vuelva aquí para pegarla a continuación.',
  'Enter your credentials': 'Ingrese sus credenciales',
  'Your key is stored locally and encrypted. It never leaves your device.':
    'Su clave se almacena localmente y se cifra. Nunca sale de su dispositivo.',
  Preserve: 'Conservar',
  'Local Backup': 'Copia de seguridad local',
  Sync: 'Sincronización',
} as const
