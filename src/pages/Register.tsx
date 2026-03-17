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
        email, password,
        options: { data: { nome_completo: nomeCompleto }, emailRedirectTo: window.location.origin + '/app' },
      });
      if (error) { toast.error(error.message); return; }
      toast.success('Conta criada! Verifique seu e-mail ou faça login.');
      navigate('/app');
    } catch {
      toast.error('Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center flex flex-col items-center">
          <img src="/images/logo-jp-nutricare.png" alt="JP NutriCare" className="h-12 object-contain mb-3" />
          <p className="text-sm text-muted-foreground">Crie sua conta e comece sua transformação</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
          <form onSubmit={handleRegister} className="space-y-4">
            <Input type="text" placeholder="Nome completo" value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)} className="h-12 bg-secondary border-border" required />
            <Input type="email" placeholder="E-mail" value={email}
              onChange={(e) => setEmail(e.target.value)} className="h-12 bg-secondary border-border" required />
            <Input type="password" placeholder="Senha (mín. 6 caracteres)" value={password}
              onChange={(e) => setPassword(e.target.value)} className="h-12 bg-secondary border-border" minLength={6} required />
            <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando conta...</> : 'Criar conta'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta? <Link to="/login" className="text-primary hover:underline font-medium">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
