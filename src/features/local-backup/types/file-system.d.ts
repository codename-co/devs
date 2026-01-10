/**
 * File System Access API Type Declarations
 *
 * These types extend the standard FileSystemHandle interfaces
 * with methods that are part of the File System Access API
 * but not yet in the standard TypeScript lib.
 */

declare global {
  interface FileSystemDirectoryHandle {
    /**
     * Request permission to read/write to this directory
     */
    requestPermission(descriptor?: {
      mode?: 'read' | 'readwrite'
    }): Promise<PermissionState>

    /**
     * Query current permission state
     */
    queryPermission(descriptor?: {
      mode?: 'read' | 'readwrite'
    }): Promise<PermissionState>

    /**
     * Iterate over directory entries
     */
    values(): AsyncIterableIterator<FileSystemHandle>
  }

  interface Window {
    /**
     * Show a directory picker dialog
     */
    showDirectoryPicker?(options?: {
      id?: string
      mode?: 'read' | 'readwrite'
      startIn?:
        | 'desktop'
        | 'documents'
        | 'downloads'
        | 'music'
        | 'pictures'
        | 'videos'
    }): Promise<FileSystemDirectoryHandle>
  }
}

export {}
