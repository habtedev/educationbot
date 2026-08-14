import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';

// Custom storage utilizing idb-keyval for robust indexedDB storage
const storage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

interface CourseState {
  favorites: string[];
  recentCourses: string[];
  progress: Record<string, { page: number; totalPages: number }>;
  toggleFavorite: (courseId: string) => void;
  addRecentCourse: (courseId: string) => void;
  updateProgress: (courseId: string, page: number, totalPages: number) => void;
}

export const useCourseStore = create<CourseState>()(
  persist(
    (set) => ({
      favorites: [],
      recentCourses: [],
      progress: {},
      toggleFavorite: (courseId) =>
        set((state) => ({
          favorites: state.favorites.includes(courseId)
            ? state.favorites.filter((id) => id !== courseId)
            : [...state.favorites, courseId],
        })),
      addRecentCourse: (courseId) =>
        set((state) => {
          const filtered = state.recentCourses.filter((id) => id !== courseId);
          return {
            recentCourses: [courseId, ...filtered].slice(0, 10),
          };
        }),
      updateProgress: (courseId, page, totalPages) =>
        set((state) => ({
          progress: {
            ...state.progress,
            [courseId]: { page, totalPages },
          },
        })),
    }),
    {
      name: 'course-storage',
      storage: createJSONStorage(() => storage),
    }
  )
);
