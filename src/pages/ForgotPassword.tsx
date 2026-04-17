import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) { toast.error(error.message); return; }
      setSent(true);
      toast.success('E-mail de recuperação enviado!');
    } catch {
      toast.error('Erro ao enviar e-mail');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060d07] flex flex-col items-center justify-center px-6 py-12">
      {/* Background atmosphere */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 50% 50% at 50% 40%, rgba(34,197,94,0.05) 0%, transparent 60%)'
      }} />

      <Link to="/" className="mb-12 relative z-10">
        <img src="/images/logo-jp-nutricare.png" alt="JP NutriCare"
          className="h-8 object-contain brightness-0 invert opacity-50" />
      </Link>

      <motion.div
        className="w-full max-w-[22rem] relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {sent ? (
          <div className="space-y-6">
            <p className="text-[9px] font-medium tracking-[0.38em] text-primary/45 uppercase">E-mail enviado</p>
            <h1 className="font-display font-light text-white" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', lineHeight: '1.05' }}>
              Verifique sua<br />caixa de entrada
            </h1>
            <p className="text-white/30 text-sm leading-relaxed">
              Enviamos o link de recuperação para <span className="text-white/55">{email}</span>.
            </p>
            <Link to="/login"
              className="inline-flex items-center gap-2 text-[10px] text-white/25 tracking-widest uppercase hover:text-white/50 transition-colors">
              <ArrowLeft className="h-3 w-3" /> Voltar ao login
            </Link>
          </div>
        ) : (
          <>
            <p className="text-[9px] font-medium tracking-[0.38em] text-primary/45 uppercase mb-3">
              Recuperar acesso
            </p>
            <h1 className="font-display font-light text-white mb-10"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', lineHeight: '1.05' }}>
              Esqueceu sua senha?
            </h1>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border border-white/[0.08] text-white/80 placeholder-white/18 px-4 py-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                style={{ colorScheme: 'dark' }}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold text-sm py-4 hover:bg-primary/90 transition-colors disabled:opacity-50 group"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  <>Enviar link de recuperação <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
                )}
              </button>
            </form>

            <Link to="/login"
              className="inline-flex items-center gap-2 mt-7 text-[10px] text-white/22 tracking-widest uppercase hover:text-white/45 transition-colors">
              <ArrowLeft className="h-3 w-3" /> Voltar ao login
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
