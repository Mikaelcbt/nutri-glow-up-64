import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nome_completo: nomeCompleto },
          emailRedirectTo: window.location.origin + '/app',
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Conta criada! Verifique seu e-mail ou faça login.');
      navigate('/app');
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      toast.error('Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="font-display text-5xl tracking-wide text-primary">JP NUTRICARE</h1>
          <p className="mt-2 text-sm text-muted-foreground">Crie sua conta e comece sua transformação</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <Input
            type="text"
            placeholder="Nome completo"
            value={nomeCompleto}
            onChange={(e) => setNomeCompleto(e.target.value)}
            className="h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            required
          />
          <Input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            required
          />
          <Input
            type="password"
            placeholder="Senha (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            minLength={6}
            required
          />
          <Button type="submit" className="h-12 w-full font-display text-lg tracking-wider" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> CRIANDO CONTA...</> : 'CRIAR CONTA'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link to="/login" className="text-primary hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
