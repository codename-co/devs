import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  'Platform Settings': 'Configuración de la plataforma',
  'Configure LLM providers, models and platform defaults for your organization':
    'Configurar proveedores de LLM, modelos y valores predeterminados de la plataforma para su organización',
  Appearance: 'Apariencia',
  'Choose your preferred language': 'Elija su idioma preferido',
  'Interface Language': 'Idioma de la interfaz',
  'Platform Name': 'Nombre de la plataforma',
  Theme: 'Tema',
  System: 'Sistema',
  Light: 'Claro',
  Dark: 'Oscuro',
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
  'LLM Providers': 'Proveedores de LLM',
  'Choose your LLM provider, manage your API credentials':
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
} as const
