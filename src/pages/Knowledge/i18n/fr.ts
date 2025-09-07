import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  'Knowledge Base': 'Base de connaissances',
  'Upload files and synchronize local folders to build your knowledge base':
    'Téléchargez des fichiers et synchronisez des dossiers locaux pour construire votre base de connaissances',
  'Add knowledge': 'Ajouter des connaissances',
  'Uploading files…': 'Téléchargement en cours…',
  'Drag & drop files here, or click to select':
    'Glissez-déposez des fichiers ici ou cliquez pour sélectionner',
  'Pick files': 'Choisir des fichiers',
  'Sync a folder': 'Synchroniser un dossier',
  'Synced folders': 'Dossiers synchronisés',
  'Last sync: {time}': 'Dernière synchro : {time}',
  Disconnected: 'Déconnecté',
  'Stop syncing': 'Arrêter la synchronisation',
  Reconnect: 'Reconnecter',
  'My Knowledge': 'Mes connaissances',
  'No knowledge items yet. Upload some files to get started!':
    'Aucun élément de connaissance pour le moment. Téléchargez des fichiers pour commencer !',
  'Knowledge Item': 'Élément de connaissance',
} as const
