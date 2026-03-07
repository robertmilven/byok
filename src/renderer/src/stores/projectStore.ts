import { create } from 'zustand'
import type { Project } from '../../../shared/types'
import { IPC } from '../../../shared/ipc-channels'

interface ProjectStore {
    projects: Project[]
    activeProject: Project | null
    loading: boolean
    fetchProjects: () => Promise<void>
    setActiveProject: (project: Project | null) => void
    createProject: (name: string, description?: string) => Promise<Project>
    updateProject: (id: string, data: Partial<Pick<Project, 'name' | 'description'>>) => Promise<void>
    archiveProject: (id: string) => Promise<void>
    deleteProject: (id: string) => Promise<void>
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
    projects: [],
    activeProject: null,
    loading: false,

    fetchProjects: async () => {
        set({ loading: true })
        try {
            const projects = await window.api.invoke<Project[]>(IPC.PROJECTS_LIST, { includeArchived: false })
            set({ projects, loading: false })
            // Auto-select first project if none selected
            if (!get().activeProject && projects.length > 0) {
                set({ activeProject: projects[0] })
            }
        } catch {
            set({ loading: false })
        }
    },

    setActiveProject: (project) => set({ activeProject: project }),

    createProject: async (name, description) => {
        const project = await window.api.invoke<Project>(IPC.PROJECTS_CREATE, { name, description })
        await get().fetchProjects()
        set({ activeProject: project })
        return project
    },

    updateProject: async (id, data) => {
        await window.api.invoke(IPC.PROJECTS_UPDATE, { id, ...data })
        await get().fetchProjects()
    },

    archiveProject: async (id) => {
        await window.api.invoke(IPC.PROJECTS_ARCHIVE, { id, archived: true })
        await get().fetchProjects()
    },

    deleteProject: async (id) => {
        await window.api.invoke(IPC.PROJECTS_DELETE, { id })
        await get().fetchProjects()
    }
}))
