import { create } from 'zustand'
import { db } from '@/lib/db'
import type { Artifact } from '@/types'
import { errorToast, successToast } from '@/lib/toast'

interface ArtifactStore {
  artifacts: Artifact[]
  currentArtifact: Artifact | null
  isLoading: boolean

  loadArtifacts: () => Promise<void>
  loadArtifact: (id: string) => Promise<void>
  createArtifact: (
    artifactData: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<Artifact>
  updateArtifact: (id: string, updates: Partial<Artifact>) => Promise<void>
  deleteArtifact: (id: string) => Promise<void>
  linkToRequirement: (
    artifactId: string,
    requirementId: string,
  ) => Promise<void>
  unlinkFromRequirement: (
    artifactId: string,
    requirementId: string,
  ) => Promise<void>
  addDependency: (artifactId: string, dependencyId: string) => Promise<void>
  removeDependency: (artifactId: string, dependencyId: string) => Promise<void>
  addReviewer: (artifactId: string, agentId: string) => Promise<void>
  getArtifactsByTask: (taskId: string) => Artifact[]
  getArtifactsByAgent: (agentId: string) => Artifact[]
  getArtifactsByStatus: (status: Artifact['status']) => Artifact[]
  getArtifactsByType: (type: Artifact['type']) => Artifact[]
  clearCurrentArtifact: () => void
}

export const useArtifactStore = create<ArtifactStore>((set, get) => ({
  artifacts: [],
  currentArtifact: null,
  isLoading: false,

  loadArtifacts: async () => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }
      const artifacts = await db.getAll('artifacts')
      set({ artifacts, isLoading: false })
    } catch (error) {
      errorToast('Failed to load artifacts', error)
      set({ isLoading: false })
    }
  },

  loadArtifact: async (id: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }
      const artifact = await db.get('artifacts', id)
      if (artifact) {
        set({ currentArtifact: artifact, isLoading: false })
      } else {
        errorToast(
          'Artifact not found',
          'The requested artifact could not be found',
        )
        set({ isLoading: false })
      }
    } catch (error) {
      errorToast('Failed to load artifact', error)
      set({ isLoading: false })
    }
  },

  createArtifact: async (artifactData) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const artifact: Artifact = {
        ...artifactData,
        id: crypto.randomUUID(),
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.add('artifacts', artifact)

      const updatedArtifacts = [...get().artifacts, artifact]
      set({
        artifacts: updatedArtifacts,
        currentArtifact: artifact,
        isLoading: false,
      })

      return artifact
    } catch (error) {
      errorToast('Failed to create artifact', error)
      set({ isLoading: false })
      throw error
    }
  },

  updateArtifact: async (id: string, updates: Partial<Artifact>) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const artifact = await db.get('artifacts', id)
      if (!artifact) {
        throw new Error('Artifact not found')
      }

      const updatedArtifact: Artifact = {
        ...artifact,
        ...updates,
        id,
        version:
          updates.content !== undefined
            ? artifact.version + 1
            : artifact.version,
        updatedAt: new Date(),
      }

      await db.update('artifacts', updatedArtifact)

      const { artifacts, currentArtifact } = get()
      const updatedArtifacts = artifacts.map((a) =>
        a.id === id ? updatedArtifact : a,
      )

      set({
        artifacts: updatedArtifacts,
        currentArtifact:
          currentArtifact?.id === id ? updatedArtifact : currentArtifact,
        isLoading: false,
      })
    } catch (error) {
      errorToast('Failed to update artifact', error)
      set({ isLoading: false })
    }
  },

  deleteArtifact: async (id: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }
      await db.delete('artifacts', id)

      const { artifacts, currentArtifact } = get()
      const updatedArtifacts = artifacts.filter((a) => a.id !== id)

      set({
        artifacts: updatedArtifacts,
        currentArtifact: currentArtifact?.id === id ? null : currentArtifact,
        isLoading: false,
      })

      successToast('Artifact deleted successfully')
    } catch (error) {
      errorToast('Failed to delete artifact', error)
      set({ isLoading: false })
    }
  },

  linkToRequirement: async (artifactId: string, requirementId: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const artifact = await db.get('artifacts', artifactId)
      if (!artifact) {
        throw new Error('Artifact not found')
      }

      if (!artifact.validates.includes(requirementId)) {
        const updatedArtifact: Artifact = {
          ...artifact,
          validates: [...artifact.validates, requirementId],
          updatedAt: new Date(),
        }

        await db.update('artifacts', updatedArtifact)

        const { artifacts, currentArtifact } = get()
        const updatedArtifacts = artifacts.map((a) =>
          a.id === artifactId ? updatedArtifact : a,
        )

        set({
          artifacts: updatedArtifacts,
          currentArtifact:
            currentArtifact?.id === artifactId
              ? updatedArtifact
              : currentArtifact,
          isLoading: false,
        })
      } else {
        set({ isLoading: false })
      }
    } catch (error) {
      errorToast('Failed to link artifact to requirement', error)
      set({ isLoading: false })
    }
  },

  unlinkFromRequirement: async (artifactId: string, requirementId: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const artifact = await db.get('artifacts', artifactId)
      if (!artifact) {
        throw new Error('Artifact not found')
      }

      const updatedArtifact: Artifact = {
        ...artifact,
        validates: artifact.validates.filter((id) => id !== requirementId),
        updatedAt: new Date(),
      }

      await db.update('artifacts', updatedArtifact)

      const { artifacts, currentArtifact } = get()
      const updatedArtifacts = artifacts.map((a) =>
        a.id === artifactId ? updatedArtifact : a,
      )

      set({
        artifacts: updatedArtifacts,
        currentArtifact:
          currentArtifact?.id === artifactId
            ? updatedArtifact
            : currentArtifact,
        isLoading: false,
      })
    } catch (error) {
      errorToast('Failed to unlink artifact from requirement', error)
      set({ isLoading: false })
    }
  },

  addDependency: async (artifactId: string, dependencyId: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const artifact = await db.get('artifacts', artifactId)
      if (!artifact) {
        throw new Error('Artifact not found')
      }

      if (!artifact.dependencies.includes(dependencyId)) {
        const updatedArtifact: Artifact = {
          ...artifact,
          dependencies: [...artifact.dependencies, dependencyId],
          updatedAt: new Date(),
        }

        await db.update('artifacts', updatedArtifact)

        const { artifacts, currentArtifact } = get()
        const updatedArtifacts = artifacts.map((a) =>
          a.id === artifactId ? updatedArtifact : a,
        )

        set({
          artifacts: updatedArtifacts,
          currentArtifact:
            currentArtifact?.id === artifactId
              ? updatedArtifact
              : currentArtifact,
          isLoading: false,
        })
      } else {
        set({ isLoading: false })
      }
    } catch (error) {
      errorToast('Failed to add dependency', error)
      set({ isLoading: false })
    }
  },

  removeDependency: async (artifactId: string, dependencyId: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const artifact = await db.get('artifacts', artifactId)
      if (!artifact) {
        throw new Error('Artifact not found')
      }

      const updatedArtifact: Artifact = {
        ...artifact,
        dependencies: artifact.dependencies.filter((id) => id !== dependencyId),
        updatedAt: new Date(),
      }

      await db.update('artifacts', updatedArtifact)

      const { artifacts, currentArtifact } = get()
      const updatedArtifacts = artifacts.map((a) =>
        a.id === artifactId ? updatedArtifact : a,
      )

      set({
        artifacts: updatedArtifacts,
        currentArtifact:
          currentArtifact?.id === artifactId
            ? updatedArtifact
            : currentArtifact,
        isLoading: false,
      })
    } catch (error) {
      errorToast('Failed to remove dependency', error)
      set({ isLoading: false })
    }
  },

  addReviewer: async (artifactId: string, agentId: string) => {
    set({ isLoading: true })
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      const artifact = await db.get('artifacts', artifactId)
      if (!artifact) {
        throw new Error('Artifact not found')
      }

      const reviewedBy = artifact.reviewedBy || []
      if (!reviewedBy.includes(agentId)) {
        const updatedArtifact: Artifact = {
          ...artifact,
          reviewedBy: [...reviewedBy, agentId],
          updatedAt: new Date(),
        }

        await db.update('artifacts', updatedArtifact)

        const { artifacts, currentArtifact } = get()
        const updatedArtifacts = artifacts.map((a) =>
          a.id === artifactId ? updatedArtifact : a,
        )

        set({
          artifacts: updatedArtifacts,
          currentArtifact:
            currentArtifact?.id === artifactId
              ? updatedArtifact
              : currentArtifact,
          isLoading: false,
        })
      } else {
        set({ isLoading: false })
      }
    } catch (error) {
      errorToast('Failed to add reviewer', error)
      set({ isLoading: false })
    }
  },

  getArtifactsByTask: (taskId: string) => {
    return get().artifacts.filter((artifact) => artifact.taskId === taskId)
  },

  getArtifactsByAgent: (agentId: string) => {
    return get().artifacts.filter((artifact) => artifact.agentId === agentId)
  },

  getArtifactsByStatus: (status: Artifact['status']) => {
    return get().artifacts.filter((artifact) => artifact.status === status)
  },

  getArtifactsByType: (type: Artifact['type']) => {
    return get().artifacts.filter((artifact) => artifact.type === type)
  },

  clearCurrentArtifact: () => {
    set({ currentArtifact: null })
  },
}))
