import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Package, Layers, BookOpen, Users, LogOut, Home, ImageIcon, FileText, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { title: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { title: 'Produtos', path: '/admin/produtos', icon: Package },
  { title: 'Módulos', path: '/admin/modulos', icon: Layers },
  { title: 'Aulas', path: '/admin/aulas', icon: BookOpen },
  { title: 'Associações', path: '/admin/associacoes', icon: Users },
  { title: 'Transformações', path: '/admin/transformacoes', icon: ImageIcon },
  { title: 'Materiais', path: '/admin/materiais', icon: FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-card flex flex-col">
        <div className="p-6">
          <Link to="/admin" className="font-display text-2xl text-primary tracking-wide">
            JP NUTRICARE
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Painel Administrativo</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border p-3 space-y-1">
          <Link
            to="/app"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" /> Ir para o App
          </Link>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
