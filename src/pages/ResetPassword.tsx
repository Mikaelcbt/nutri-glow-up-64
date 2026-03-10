import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('As senhas não coincidem'); return; }
    if (password.length < 6) { toast.error('A senha deve ter no mínimo 6 caracteres'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { toast.error(error.message); return; }
      toast.success('Senha atualizada com sucesso!');
      navigate('/app', { replace: true });
    } catch {
      toast.error('Erro ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="font-display text-5xl font-semibold text-foreground">JP NutriCare</h1>
          <p className="mt-2 text-sm text-muted-foreground">Defina sua nova senha</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="password" placeholder="Nova senha (mín. 6 caracteres)" value={password}
              onChange={(e) => setPassword(e.target.value)} className="h-12 bg-secondary border-border" minLength={6} required />
            <Input type="password" placeholder="Confirme a nova senha" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 bg-secondary border-border" minLength={6} required />
            <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Atualizando...</> : 'Atualizar senha'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
