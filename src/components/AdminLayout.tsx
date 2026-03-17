import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Package, Layers, BookOpen, Users, LogOut, Home, ImageIcon, FileText, LayoutDashboard, Trophy, ListChecks, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { title: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { title: 'Produtos', path: '/admin/produtos', icon: Package },
  { title: 'Módulos', path: '/admin/modulos', icon: Layers },
  { title: 'Aulas', path: '/admin/aulas', icon: BookOpen },
  { title: 'Associações', path: '/admin/associacoes', icon: Users },
  { title: 'Transformações', path: '/admin/transformacoes', icon: ImageIcon },
  { title: 'Materiais', path: '/admin/materiais', icon: FileText },
  { title: 'Desafios', path: '/admin/desafios', icon: Trophy },
  { title: 'Hábitos', path: '/admin/habitos', icon: ListChecks },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="p-6">
        <Link to="/admin" className="font-display text-2xl text-primary tracking-wide" onClick={() => setDrawerOpen(false)}>
          JP NUTRICARE
        </Link>
        <p className="text-xs text-muted-foreground mt-1">Painel Administrativo</p>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setDrawerOpen(false)}
            className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors ${
              location.pathname === item.path
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {item.title}
          </Link>
        ))}
      </nav>

      <div className="border-t border-border p-3 space-y-1">
        <Link
          to="/app"
          onClick={() => setDrawerOpen(false)}
          className="flex items-center gap-3 rounded-md px-3 py-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" /> Ir para o App
        </Link>
        <button
          onClick={() => { signOut(); setDrawerOpen(false); }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-card hidden md:flex flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Header */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-card border-b border-border flex items-center justify-between px-4">
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={() => setDrawerOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-display text-lg text-primary font-semibold">Admin</span>
          <div className="w-10" />
        </header>
      )}

      {/* Mobile Drawer */}
      <AnimatePresence>
        {drawerOpen && isMobile && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-card shadow-xl flex flex-col"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between px-4 h-14 border-b border-border">
                <span className="font-display text-lg text-primary font-semibold">Admin</span>
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={() => setDrawerOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                {sidebarContent}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Content */}
      <main className={`flex-1 overflow-auto ${isMobile ? 'pt-14 p-4' : 'p-8'}`}>
        {children}
      </main>
    </div>
  );
}
