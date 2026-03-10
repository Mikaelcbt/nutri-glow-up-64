import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, X } from 'lucide-react';

export const WHATSAPP_NUMBER = '5511999999999';

interface Props {
  open: boolean;
  onClose: () => void;
  programName?: string;
}

export default function AccessRequestModal({ open, onClose, programName }: Props) {
  const message = encodeURIComponent(
    `Olá! Gostaria de solicitar acesso ao programa${programName ? ` "${programName}"` : ''} na plataforma JP NutriCare.`
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-center max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-foreground">Solicitar Acesso</DialogTitle>
          <DialogDescription className="text-muted-foreground mt-2">
            Para acessar {programName ? `o programa "${programName}"` : 'este programa'}, entre em contato com nossa equipe.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button asChild className="active:scale-[0.97] transition-transform">
            <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-5 w-5" /> Falar no WhatsApp
            </a>
          </Button>
          <Button variant="outline" onClick={onClose} className="active:scale-[0.97] transition-transform">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
