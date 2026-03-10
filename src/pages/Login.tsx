import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error(error.message); return; }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', data.user.id).maybeSingle();

      navigate(profile?.role === 'admin' ? '/admin' : '/app', { replace: true });
    } catch {
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="font-display text-5xl font-semibold text-foreground">JP NutriCare</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sua plataforma de saúde e bem-estar</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email" placeholder="E-mail" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-secondary border-border" required
            />
            <Input
              type="password" placeholder="Senha" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-secondary border-border" required
            />
            <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</> : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline block">
              Esqueceu sua senha?
            </Link>
            <p className="text-sm text-muted-foreground">
              Não tem conta?{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">Criar conta</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
