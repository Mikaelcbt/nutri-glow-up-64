import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  nome_completo: string | null;
  avatar_url: string | null;
  role: 'aluno' | 'admin' | 'nutricionista';
  criado_em: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const handledSessionKeyRef = useRef<string | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar perfil:', error);
        setProfile(null);
        return null;
      }

      setProfile(data);
      return data;
    } catch (error) {
      console.error('Erro inesperado ao carregar perfil:', error);
      setProfile(null);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const applySession = async (nextSession: Session | null, force = false) => {
      const sessionKey = nextSession?.access_token ?? null;

      if (!force && handledSessionKeyRef.current === sessionKey) {
        if (isMounted) setLoading(false);
        return;
      }

      handledSessionKeyRef.current = sessionKey;

      if (!isMounted) return;
      setSession(nextSession);

      if (nextSession?.user) {
        await fetchProfile(nextSession.user.id);
      } else if (isMounted) {
        setProfile(null);
      }

      if (isMounted) setLoading(false);
    };

    const init = async () => {
      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Erro ao obter sessão:', error);
          if (isMounted) {
            setSession(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        await applySession(initialSession, true);
      } catch (error) {
        console.error('Erro inesperado ao inicializar autenticação:', error);
        if (isMounted) {
          setSession(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    void init();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erro ao sair:', error);
      }
    } finally {
      handledSessionKeyRef.current = null;
      setSession(null);
      setProfile(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
