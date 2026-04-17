import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Register() {
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen bg-[#060d07] flex">

      {/* ─── Left panel — brand identity ─── */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] p-14 relative overflow-hidden border-r border-white/[0.04]">
        {/* Atmospheric radial */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 70% 70% at 40% 55%, rgba(34,197,94,0.055) 0%, transparent 65%)'
        }} />

        {/* Concentric rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full border border-white/[0.025]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full border border-primary/[0.04]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-primary/[0.07]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80px] h-[80px] rounded-full bg-primary/[0.05] blur-xl" />

        {/* Grain */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }} />

        <img src="/images/logo-jp-nutricare.png" alt="JP NutriCare"
          className="h-7 object-contain brightness-0 invert opacity-35 w-fit relative z-10" />

        <div className="relative z-10 max-w-xs">
          <p className="font-display font-light text-white/50 leading-[1.18] mb-8"
            style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)' }}>
            "A sua transformação começa com uma decisão. Você já tomou a certa."
          </p>
          <div className="flex items-center gap-3">
            <div className="h-px w-7 bg-primary/35" />
            <p className="text-[9px] tracking-[0.32em] uppercase text-primary/35">JP NutriCare</p>
          </div>
        </div>

        <p className="text-[9px] text-white/12 tracking-[0.3em] uppercase relative z-10">
          Plataforma Premium de Nutrição
        </p>
      </div>

      {/* ─── Right panel — form ─── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden mb-12">
          <img src="/images/logo-jp-nutricare.png" alt="JP NutriCare"
            className="h-9 object-contain brightness-0 invert opacity-60 mx-auto" />
        </div>

        <motion.div
          className="w-full max-w-[22rem]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[9px] font-medium tracking-[0.38em] text-primary/45 uppercase mb-3">
            Crie sua conta
          </p>
          <h1 className="font-display font-light text-white mb-10"
            style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', lineHeight: '1.05' }}>
            Comece sua transformação
          </h1>

          <form onSubmit={handleRegister} className="space-y-3">
            <input
              type="text"
              placeholder="Nome completo"
              value={nomeCompleto}
              onChange={e => setNomeCompleto(e.target.value)}
              required
              className="w-full bg-transparent border border-white/[0.08] text-white/80 placeholder-white/18 px-4 py-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              style={{ colorScheme: 'dark' }}
            />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-transparent border border-white/[0.08] text-white/80 placeholder-white/18 px-4 py-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              style={{ colorScheme: 'dark' }}
            />
            <input
              type="password"
              placeholder="Senha (mín. 6 caracteres)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-transparent border border-white/[0.08] text-white/80 placeholder-white/18 px-4 py-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              style={{ colorScheme: 'dark' }}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold text-sm py-4 hover:bg-primary/90 transition-colors disabled:opacity-50 group mt-1"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Criando conta...</>
              ) : (
                <>Criar conta <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
              )}
            </button>
          </form>

          <p className="mt-7 text-[11px] text-white/18">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary/60 hover:text-primary transition-colors">
              Entrar
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
