import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, ArrowLeftRight, FileText, User, LogOut, Menu, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NutriChatFloat from '@/components/NutriChatFloat';

const navItems = [
  { title: 'Início', path: '/app', icon: Home },
  { title: 'Comunidade', path: '/app/comunidade', icon: Users },
  { title: 'Antes & Depois', path: '/app/antes-e-depois', icon: ArrowLeftRight },
  { title: 'Materiais', path: '/app/materiais', icon: FileText },
  { title: 'NutriIA', path: '/app/nutricionista-ia', icon: Sparkles },
  { title: 'Perfil', path: '/app/perfil', icon: User },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initial = profile?.nome_completo?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-border">
          <Link to="/app" className="font-display text-2xl font-semibold text-foreground tracking-wide">
            JP NutriCare
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item, i) => {
            const isActive = location.pathname === item.path;
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
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground hover:translate-x-1'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              </motion.div>
            );
          })}
          {profile?.role === 'admin' && (
            <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <Link
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground hover:translate-x-1 transition-all duration-200"
              >
                <Shield className="h-4 w-4" />
                Painel Admin
              </Link>
            </motion.div>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
              {initial}
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
        <header className="flex h-14 items-center border-b border-border px-4 lg:hidden bg-card">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-3 font-display text-lg font-semibold text-foreground">JP NutriCare</span>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
