import { create } from 'zustand';
import { LogEntry } from '../types/log';

interface LogStore {
  logs: LogEntry[];
  filterLevel: string;
  searchQuery: string;
  autoScroll: boolean;

  addLog: (entry: LogEntry) => void;
  setFilterLevel: (level: string) => void;
  setSearchQuery: (query: string) => void;
  setAutoScroll: (enabled: boolean) => void;
  clearLogs: () => void;
  getFilteredLogs: () => LogEntry[];
}

export const useLogStore = create<LogStore>((set, get) => ({
  logs: [
    {
      timestamp: Date.now(),
      level: 'INFO',
      message: 'Scrcpy Studio initialized. Ready to control Android devices.',
      raw: 'Scrcpy Studio initialized.',
    },
  ],
  filterLevel: 'ALL',
  searchQuery: '',
  autoScroll: true,

  addLog: (entry) => {
    set((state) => ({
      logs: [...state.logs.slice(-499), entry], // keep last 500 logs in memory for high performance
    }));
  },

  setFilterLevel: (level) => set({ filterLevel: level }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setAutoScroll: (enabled) => set({ autoScroll: enabled }),
  clearLogs: () => set({ logs: [] }),

  getFilteredLogs: () => {
    const { logs, filterLevel, searchQuery } = get();
    return logs.filter((log) => {
      const matchesLevel = filterLevel === 'ALL' || log.level.toUpperCase() === filterLevel.toUpperCase();
      const matchesQuery =
        searchQuery === '' ||
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.raw.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLevel && matchesQuery;
    });
  },
}));
