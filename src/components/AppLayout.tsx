import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation } from 'react-router-dom';
import { Home, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/50 bg-background/90 backdrop-blur-md px-8 md:px-16">
        <Link to="/app" className="font-display text-2xl tracking-wide text-primary">
          JP NUTRICARE
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/app"
            className={`text-sm transition-colors hover:text-foreground ${
              location.pathname === '/app' ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            <Home className="h-4 w-4" />
          </Link>
          <Link
            to="/app/perfil"
            className={`text-sm transition-colors hover:text-foreground ${
              location.pathname === '/app/perfil' ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            <User className="h-4 w-4" />
          </Link>
          {profile?.role === 'admin' && (
            <Link to="/admin" className="text-xs text-primary hover:underline">
              Admin
            </Link>
          )}
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}
