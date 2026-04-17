import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <div className="min-h-screen bg-[#060d07] flex flex-col items-center justify-center px-6 py-12">
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 50% 50% at 50% 40%, rgba(34,197,94,0.05) 0%, transparent 60%)'
      }} />

      <div className="mb-12 relative z-10">
        <img src="/images/logo-jp-nutricare.png" alt="JP NutriCare"
          className="h-8 object-contain brightness-0 invert opacity-50" />
      </div>

      <motion.div
        className="w-full max-w-[22rem] relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[9px] font-medium tracking-[0.38em] text-primary/45 uppercase mb-3">
          Nova senha
        </p>
        <h1 className="font-display font-light text-white mb-10"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', lineHeight: '1.05' }}>
          Defina sua nova senha
        </h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            placeholder="Nova senha (mín. 6 caracteres)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-transparent border border-white/[0.08] text-white/80 placeholder-white/18 px-4 py-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            style={{ colorScheme: 'dark' }}
          />
          <input
            type="password"
            placeholder="Confirme a nova senha"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-transparent border border-white/[0.08] text-white/80 placeholder-white/18 px-4 py-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            style={{ colorScheme: 'dark' }}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold text-sm py-4 hover:bg-primary/90 transition-colors disabled:opacity-50 group"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Atualizando...</>
            ) : (
              <>Atualizar senha <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
