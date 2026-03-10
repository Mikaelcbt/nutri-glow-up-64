import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent">
          <span className="font-display text-4xl font-bold text-accent-foreground">404</span>
        </div>
        <h1 className="font-display text-3xl font-semibold text-foreground">Página não encontrada</h1>
        <p className="text-muted-foreground max-w-sm mx-auto">
          A página que você procura não existe ou foi movida.
        </p>
        <Button asChild size="lg">
          <Link to="/"><Home className="mr-2 h-4 w-4" /> Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}