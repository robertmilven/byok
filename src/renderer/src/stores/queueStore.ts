import { create } from 'zustand'
import type { Job, QueueEvent } from '../../../shared/types'

interface QueueStore {
    events: QueueEvent[]
    activeJobs: Map<string, Job>
    pending: number
    running: number
    addEvent: (event: QueueEvent) => void
    clearEvents: () => void
}

export const useQueueStore = create<QueueStore>((set, get) => ({
    events: [],
    activeJobs: new Map(),
    pending: 0,
    running: 0,

    addEvent: (event: QueueEvent) => {
        set((state) => {
            const jobs = new Map(state.activeJobs)
            jobs.set(event.job.id, event.job)

            // Count statuses
            let pending = 0
            let running = 0
            for (const j of jobs.values()) {
                if (j.status === 'queued') pending++
                if (j.status === 'running') running++
                // Remove old completed/failed/cancelled from tracking after keeping for display
            }

            return {
                events: [event, ...state.events].slice(0, 100), // keep last 100 events
                activeJobs: jobs,
                pending,
                running
            }
        })
    },

    clearEvents: () => set({ events: [], activeJobs: new Map(), pending: 0, running: 0 })
}))
