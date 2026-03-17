import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, ArrowLeftRight, FileText, User, LogOut, Menu, Shield, Sparkles, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NutriChatFloat from '@/components/NutriChatFloat';
import NotificationBell from '@/components/NotificationBell';

const navItems = [
  { title: 'Início', path: '/app', icon: Home },
  { title: 'Comunidade', path: '/app/comunidade', icon: Users },
  { title: 'Desafios', path: '/app/desafios', icon: Trophy },
  { title: 'Antes & Depois', path: '/app/antes-e-depois', icon: ArrowLeftRight },
  { title: 'Materiais', path: '/app/materiais', icon: FileText },
  { title: 'NutriIA', path: '/app/nutricionista-ia', icon: Sparkles },
  { title: 'Perfil', path: '/app/perfil', icon: User },
];

// Bottom bar items (5 main items for mobile)
const bottomNavItems = [
  { title: 'Início', path: '/app', icon: Home },
  { title: 'Desafios', path: '/app/desafios', icon: Trophy },
  { title: 'Comunidade', path: '/app/comunidade', icon: Users },
  { title: 'NutriIA', path: '/app/nutricionista-ia', icon: Sparkles },
  { title: 'Perfil', path: '/app/perfil', icon: User },
];

// Secondary items accessible via hamburger menu on mobile
const secondaryNavItems = [
  { title: 'Antes & Depois', path: '/app/antes-e-depois', icon: ArrowLeftRight },
  { title: 'Materiais', path: '/app/materiais', icon: FileText },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const initial = profile?.nome_completo?.charAt(0)?.toUpperCase() || 'U';

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar overlay (for animation on smaller desktops) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden hidden md:block"
            onClick={() => setSidebarOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar — hidden on mobile */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card flex-col transition-transform duration-300 lg:translate-x-0 lg:static hidden md:flex ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ borderRight: '1px solid transparent', borderImage: 'linear-gradient(to bottom, hsl(142 76% 93%), hsl(142 72% 37% / 0.15), transparent) 1' }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-border">
          <Link to="/app" className="flex items-center gap-2">
            <img src="/images/logo-jp-nutricare.png" alt="JP NutriCare" className="h-10 object-contain" />
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item, i) => {
            const active = isActive(item.path);
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <Link
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`icon-bounce flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-accent to-accent/60 text-accent-foreground border-l-[3px] border-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground hover:translate-x-1'
                  }`}
                >
                  <item.icon className="h-4 w-4 nav-icon" />
                  {item.title}
                </Link>
              </motion.div>
            );
          })}
          {profile?.role === 'admin' && (
            <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <div className="my-3 border-t border-border" />
              <Link
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className="icon-bounce flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground hover:translate-x-1 transition-all duration-200"
              >
                <Shield className="h-4 w-4 nav-icon" />
                Painel Admin
              </Link>
            </motion.div>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-full p-[2px] bg-gradient-to-br from-primary to-primary/60">
              <Avatar className="h-9 w-9 border-2 border-card">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.nome_completo || ''} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profile?.nome_completo || 'Usuário'}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start text-muted-foreground hover:text-foreground active:scale-[0.97] transition-transform"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="flex h-14 items-center justify-between border-b border-border px-4 md:hidden bg-card sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/app" className="flex items-center">
              <img src="/images/logo-jp-nutricare.png" alt="JP NutriCare" className="h-9 object-contain" />
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Link to="/app/perfil">
              <div className="rounded-full p-[1.5px] bg-gradient-to-br from-primary to-primary/60">
                <Avatar className="h-8 w-8 border-2 border-card">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile.nome_completo || ''} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                    {initial}
                  </AvatarFallback>
                </Avatar>
              </div>
            </Link>
          </div>
        </header>

        {/* Desktop notification bell */}
        <div className="hidden md:flex h-14 items-center justify-end border-b border-border px-6 bg-card">
          <NotificationBell />
        </div>

        <main className="flex-1 scroll-smooth pb-20 md:pb-0">{children}</main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card border-t border-border safe-area-bottom">
          <div className="flex items-center justify-around h-16">
            {bottomNavItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative ${
                    active ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <motion.div animate={active ? { scale: 1.1 } : { scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                    <item.icon className="h-5 w-5" />
                  </motion.div>
                  <span className="text-[10px] font-medium leading-none">{item.title}</span>
                  {active && (
                    <motion.div
                      className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary"
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Mobile secondary menu drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm md:hidden"
                onClick={() => setMobileMenuOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.div
                className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-card shadow-xl md:hidden flex flex-col"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <div className="flex h-14 items-center justify-between px-4 border-b border-border">
                  <span className="font-display text-lg font-semibold text-foreground flex items-center gap-1">
                    <span className="text-base">🌿</span> JP <span className="logo-shimmer">N</span>utriCare
                  </span>
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={() => setMobileMenuOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1">
                  {secondaryNavItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all ${
                        isActive(item.path)
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.title}
                    </Link>
                  ))}
                  {profile?.role === 'admin' && (
                    <>
                      <div className="my-3 border-t border-border" />
                      <Link
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Shield className="h-5 w-5" />
                        Painel Admin
                      </Link>
                    </>
                  )}
                </nav>

                <div className="border-t border-border p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-9 w-9">
                      {profile?.avatar_url ? (
                        <AvatarImage src={profile.avatar_url} alt="" className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{profile?.nome_completo || 'Usuário'}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { signOut(); setMobileMenuOpen(false); }}
                    className="w-full justify-start text-muted-foreground hover:text-foreground h-11"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <NutriChatFloat />
      </div>
    </div>
  );
}
