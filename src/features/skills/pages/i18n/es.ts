import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  // Page
  'Agent Skills': 'Habilidades de Agente',
  'Discover, install, and manage specialized skills for your agents':
    'Descubre, instala y gestiona habilidades especializadas para tus agentes',
  'Browse the SkillsMP registry of 227k+ Agent Skills':
    'Explora el registro SkillsMP de más de 227k habilidades',

  // Tabs
  Discover: 'Descubrir',
  Installed: 'Instaladas',

  // Search
  'Search skills...': 'Buscar habilidades...',
  'Search by keyword or describe what you need':
    'Buscar por palabra clave o describe lo que necesitas',
  Keyword: 'Palabra clave',
  'AI Search': 'Búsqueda IA',
  'No skills found': 'No se encontraron habilidades',
  'Try a different search query': 'Prueba con una consulta diferente',
  'Searching...': 'Buscando...',

  // Skill Card
  'by {author}': 'por {author}',
  '{n} stars': '{n} estrellas',
  Install: 'Instalar',
  'Installing...': 'Instalando...',
  Uninstall: 'Desinstalar',
  Enable: 'Habilitar',
  Disable: 'Deshabilitar',
  'View Details': 'Ver detalles',
  Python: 'Python',
  Bash: 'Bash',
  JavaScript: 'JavaScript',
  Scripts: 'Scripts',
  References: 'Referencias',
  Assets: 'Recursos',
  Compatible: 'Compatible',
  Partial: 'Parcial',

  // Skill Detail Modal
  'Skill Details': 'Detalles de la habilidad',
  Instructions: 'Instrucciones',
  Files: 'Archivos',
  Settings: 'Configuración',
  Author: 'Autor',
  License: 'Licencia',
  Stars: 'Estrellas',
  Source: 'Fuente',
  'View on GitHub': 'Ver en GitHub',
  'Installed on': 'Instalada el',
  'Last updated': 'Última actualización',
  'Available Scripts': 'Scripts disponibles',
  'Reference Documents': 'Documentos de referencia',
  'Asset Files': 'Archivos de recursos',
  'Required Packages': 'Paquetes requeridos',
  Language: 'Lenguaje',
  'No scripts included': 'No se incluyen scripts',
  'This skill provides instructions only':
    'Esta habilidad proporciona solo instrucciones',
  'Assigned Agents': 'Agentes asignados',
  'All agents': 'Todos los agentes',
  'Select specific agents': 'Seleccionar agentes específicos',
  'Auto-activate': 'Activación automática',
  'Always inject skill instructions':
    'Siempre inyectar instrucciones de la habilidad',
  'Confirm Uninstall': 'Confirmar desinstalación',
  'Are you sure you want to uninstall this skill?':
    '¿Estás seguro de que quieres desinstalar esta habilidad?',
  Cancel: 'Cancelar',
  'Skill installed successfully': 'Habilidad instalada correctamente',
  'Skill uninstalled': 'Habilidad desinstalada',
  'Failed to install skill': 'Error al instalar la habilidad',
  'Failed to fetch skill from GitHub':
    'Error al obtener la habilidad desde GitHub',

  // Compatibility
  'Browser Compatible': 'Compatible con el navegador',
  'Can execute Python and JavaScript scripts in-browser':
    'Puede ejecutar scripts de Python y JavaScript en el navegador',
  'Partial Compatibility': 'Compatibilidad parcial',
  'Some scripts require system tools that can\'t run in-browser':
    'Algunos scripts requieren herramientas del sistema no disponibles en el navegador',
  'Instructions Only': 'Solo instrucciones',
  'Scripts are available for reference but can\'t execute in-browser':
    'Los scripts están disponibles como referencia pero no se pueden ejecutar en el navegador',

  // Execution
  'Run Script': 'Ejecutar script',
  'Running script…': 'Ejecutando script\u2026',
  'Initializing Python environment…': 'Inicializando entorno Python\u2026',
  'Installing packages…': 'Instalando paquetes\u2026',
  'Script executed successfully': 'Script ejecutado con éxito',
  'Script execution failed': 'Falló la ejecución del script',
  'Execution timed out': 'Tiempo de ejecución agotado',
  'Confirm Script Execution': 'Confirmar ejecución del script',
  'This script will run in a sandboxed Python environment.':
    'Este script se ejecutará en un entorno Python aislado.',
  'Packages to install': 'Paquetes a instalar',
  'Input files': 'Archivos de entrada',
  'Estimated execution time': 'Tiempo estimado de ejecución',
  Run: 'Ejecutar',
  'Python Environment': 'Entorno Python',
  Ready: 'Listo',
  'Loading…': 'Cargando\u2026',
  'Not initialized': 'No inicializado',
  'Pre-warm Python': 'Precalentar Python',
  'Download and initialize the Python environment in the background':
    'Descargar e inicializar el entorno Python en segundo plano',
  'Incompatible package': 'Paquete incompatible',
  'This package may not work in the browser environment':
    'Este paquete podría no funcionar en el entorno del navegador',

  // Try it out
  'Try it out': 'Probar',
  'Select script': 'Seleccionar script',
  'Arguments (JSON)': 'Argumentos (JSON)',
  'Arguments must be a JSON object': 'Los argumentos deben ser un objeto JSON',
  'Invalid JSON': 'JSON inválido',
  'No Python scripts available': 'No hay scripts Python disponibles',
  'Only Python scripts can be executed in the sandbox': 'Solo se pueden ejecutar scripts Python en el sandbox',
  'Pre-compiled in Pyodide': 'Precompilado en Pyodide',
  'Will be installed via micropip': 'Se instalará vía micropip',
  Done: 'Listo',
  'Return value': 'Valor de retorno',
  Output: 'Salida',
  Warnings: 'Advertencias',
  Error: 'Error',
  'Output files': 'Archivos de salida',
  'packages installed': 'paquetes instalados',

  // Empty states
  'No skills installed': 'No hay habilidades instaladas',
  'Search the SkillsMP registry to discover and install skills':
    'Busca en el registro SkillsMP para descubrir e instalar habilidades',
  'Your installed skills will appear here':
    'Tus habilidades instaladas aparecerán aquí',
  'API key required': 'Clave API requerida',
  'Enter your SkillsMP API key in Settings to search for skills':
    'Ingresa tu clave API de SkillsMP en Configuración para buscar habilidades',
  // Manual URL install
  'Install from GitHub URL': 'Instalar desde URL de GitHub',
  'Paste a GitHub URL to a skill directory or SKILL.md file':
    'Pegue una URL de GitHub a un directorio de habilidad o archivo SKILL.md',
}
