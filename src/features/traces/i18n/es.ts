import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  // Page titles
  'Traces and Metrics': 'Trazas y Métricas',
  'Trace Details': 'Detalles de la Traza',
  Dashboard: 'Panel de Control',
  'LLM Observability': 'Observabilidad LLM',
  'Monitor and analyze all LLM calls':
    'Monitorear y analizar todas las llamadas LLM',

  // Tabs
  Logs: 'Registros',
  Metrics: 'Métricas',

  // Filters
  All: 'Todo',
  Completed: 'Completado',
  Error: 'Error',
  Running: 'En ejecución',
  Pending: 'Pendiente',
  'Filter by status': 'Filtrar por estado',
  'Filter by provider': 'Filtrar por proveedor',
  'Filter by agent': 'Filtrar por agente',
  'Search traces...': 'Buscar trazas...',

  // Time periods
  'Time Range': 'Rango de tiempo',
  'Last Hour': 'Última hora',
  'Last 24 Hours': 'Últimas 24 horas',
  'Last 7 Days': 'Últimos 7 días',
  'Last 30 Days': 'Últimos 30 días',
  'All Time': 'Todo el tiempo',

  // Metrics
  'Total Requests': 'Total de Solicitudes',
  'Success Rate': 'Tasa de Éxito',
  'Total Tokens': 'Total de Tokens',
  'Total Cost': 'Costo Total',
  'Avg Duration': 'Duración Promedio',
  'Error Rate': 'Tasa de Errores',
  'Requests Over Time': 'Solicitudes en el Tiempo',
  'Token Usage': 'Uso de Tokens',
  'Cost Breakdown': 'Desglose de Costos',
  'Model Distribution': 'Distribución de Modelos',
  'Provider Distribution': 'Distribución de Proveedores',
  'Agent Usage': 'Uso de Agentes',

  // Trace details
  'Trace ID': 'ID de Traza',
  Status: 'Estado',
  Duration: 'Duración',
  Started: 'Iniciado',
  Ended: 'Finalizado',
  Model: 'Modelo',
  Provider: 'Proveedor',
  Tokens: 'Tokens',
  Cost: 'Costo',
  Input: 'Entrada',
  Output: 'Salida',
  Spans: 'Spans',
  Metadata: 'Metadatos',
  'No spans found': 'No se encontraron spans',

  // Span types
  'LLM Call': 'Llamada LLM',
  'Image Generation': 'Generación de Imágenes',
  'Video Generation': 'Generación de Video',
  Agent: 'Agente',
  Tool: 'Herramienta',
  Chain: 'Cadena',
  Retrieval: 'Recuperación',
  Embedding: 'Embedding',
  Custom: 'Personalizado',

  // Actions
  'Clear All': 'Borrar Todo',
  Export: 'Exportar',
  Refresh: 'Actualizar',
  Delete: 'Eliminar',
  Back: 'Volver',
  'View Details': 'Ver Detalles',

  // Empty states
  'No traces yet': 'Sin trazas aún',
  'Start chatting with agents to see LLM traces here':
    'Comienza a chatear con agentes para ver las trazas LLM aquí',
  'No data available': 'No hay datos disponibles',

  // Settings
  'Tracing Settings': 'Configuración de Trazado',
  'Enable Tracing': 'Habilitar Trazado',
  'Capture Input': 'Capturar Entrada',
  'Capture Output': 'Capturar Salida',
  'Retention Days': 'Días de Retención',
  'Max Traces': 'Máx. Trazas',

  // Misc
  'Prompt Tokens': 'Tokens de Prompt',
  'Completion Tokens': 'Tokens de Completado',
  requests: 'solicitudes',
  tokens: 'tokens',
  ms: 'ms',
  Average: 'Promedio',
  Median: 'Mediana',
  '{n}th percentile': 'Percentil {n}',
  'Are you sure you want to delete all traces?':
    '¿Está seguro de que desea eliminar todas las trazas?',
  'This action cannot be undone.': 'Esta acción no se puede deshacer.',
  Cancel: 'Cancelar',
  Confirm: 'Confirmar',

  // Additional page strings
  'Trace not found': 'Traza no encontrada',
  'Failed to load trace': 'Error al cargar la traza',
  'Failed to load traces': 'Error al cargar las trazas',
  'Back to Traces': 'Volver a Trazas',
  'Trace Detail': 'Detalle de Traza',
  'Trace deleted successfully': 'Traza eliminada con éxito',
  'All traces deleted successfully': 'Todas las trazas eliminadas con éxito',
  'Failed to delete trace': 'Error al eliminar la traza',
  'Failed to clear traces': 'Error al borrar las trazas',
  'Configuration saved successfully': 'Configuración guardada con éxito',
  'Failed to save configuration': 'Error al guardar la configuración',
  'Monitor and analyze LLM requests': 'Monitorear y analizar solicitudes LLM',
  'Capture all LLM requests': 'Capturar todas las solicitudes LLM',
  'How long to keep traces': 'Cuánto tiempo conservar las trazas',
  'Sampling Rate': 'Tasa de Muestreo',
  'Percentage of requests to trace': 'Porcentaje de solicitudes a rastrear',
  Save: 'Guardar',
  Deleted: 'Eliminado',
  Cleared: 'Borrado',
  Saved: 'Guardado',
  'Clear All Traces': 'Borrar Todas las Trazas',
  'Delete all traces permanently': 'Eliminar todas las trazas permanentemente',
  'Are you sure you want to delete all traces? This action cannot be undone.':
    '¿Está seguro de que desea eliminar todas las trazas? Esta acción no se puede deshacer.',
  'Delete All': 'Eliminar Todo',
  Settings: 'Configuración',
  'Current Session': 'Sesión Actual',

  // Sessions view
  Sessions: 'Sesiones',
  Session: 'Sesión',
  'Single Request': 'Solicitud Única',
  Conversation: 'Conversación',
  Task: 'Tarea',
  'Search sessions...': 'Buscar sesiones...',
  'Search logs...': 'Buscar registros...',
  sessions: 'sesiones',
  'No sessions found matching your search':
    'No se encontraron sesiones que coincidan con su búsqueda',
  'Just now': 'Ahora mismo',
  Name: 'Nombre',
}
