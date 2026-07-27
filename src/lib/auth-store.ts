import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const ADMIN_EMAIL = 'shahbazahmad9783@gmail.com'

export interface AuthUser {
  email: string
  name: string | null
  image: string | null
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  isAdmin: () => boolean
  signIn: (user: AuthUser) => void
  signOut: () => void
  setLoading: (loading: boolean) => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      isAdmin: () => {
        const u = get().user
        return !!u && u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
      },
      signIn: (user) => set({ user, loading: false }),
      signOut: () => set({ user: null, loading: false }),
      setLoading: (loading) => set({ loading }),
    }),
    { name: 'aurora-auth' }
  )
)
