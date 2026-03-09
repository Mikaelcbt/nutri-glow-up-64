import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface LessonData {
  id: string;
  titulo: string;
  descricao: string;
  conteudo: string;
  video_url: string;
  ordem: number;
  module_id: string;
}

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [completed, setCompleted] = useState(false);
  const [siblings, setSiblings] = useState<{ prev: string | null; next: string | null }>({ prev: null, next: null });

  useEffect(() => {
    if (id) loadLesson();
  }, [id, user]);

  const loadLesson = async () => {
    const { data } = await supabase.from('lessons').select('*').eq('id', id).maybeSingle();
    if (!data) return;
    setLesson(data);

    // Check completion
    if (user) {
      const { data: prog } = await supabase
        .from('rastreamento_progresso')
        .select('concluido')
        .eq('user_id', user.id)
        .eq('lesson_id', data.id)
        .maybeSingle();
      setCompleted(prog?.concluido || false);
    }

    // Load siblings
    const { data: allLessons } = await supabase
      .from('lessons')
      .select('id, ordem')
      .eq('module_id', data.module_id)
      .order('ordem');

    if (allLessons) {
      const idx = allLessons.findIndex(l => l.id === data.id);
      setSiblings({
        prev: idx > 0 ? allLessons[idx - 1].id : null,
        next: idx < allLessons.length - 1 ? allLessons[idx + 1].id : null,
      });
    }
  };

  const markComplete = async () => {
    if (!user || !lesson) return;
    const { error } = await supabase
      .from('rastreamento_progresso')
      .upsert({
        user_id: user.id,
        lesson_id: lesson.id,
        concluido: true,
        concluido_em: new Date().toISOString(),
      }, { onConflict: 'user_id,lesson_id' });

    if (error) {
      toast.error('Erro ao salvar progresso');
      return;
    }
    setCompleted(true);
    toast.success('Aula concluída!');
  };

  if (!lesson) {
    return (
      <AppLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Video Player */}
        {lesson.video_url && (
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-card mb-8">
            <iframe
              src={lesson.video_url}
              className="h-full w-full"
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture"
            />
          </div>
        )}

        {/* Title & Actions */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-4xl">{lesson.titulo}</h1>
            <p className="mt-2 text-muted-foreground">{lesson.descricao}</p>
          </div>
          <Button
            onClick={markComplete}
            disabled={completed}
            className={`flex-shrink-0 font-display tracking-wider ${completed ? 'bg-primary/20 text-primary' : ''}`}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {completed ? 'CONCLUÍDA' : 'MARCAR COMO CONCLUÍDA'}
          </Button>
        </div>

        {/* Markdown Content */}
        {lesson.conteudo && (
          <div className="prose prose-invert max-w-none mb-12">
            <ReactMarkdown>{lesson.conteudo}</ReactMarkdown>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-border pt-6">
          {siblings.prev ? (
            <Button asChild variant="outline" className="border-border text-foreground hover:bg-secondary">
              <Link to={`/app/aula/${siblings.prev}`}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Aula anterior
              </Link>
            </Button>
          ) : <div />}
          {siblings.next ? (
            <Button asChild className="font-display tracking-wider">
              <Link to={`/app/aula/${siblings.next}`}>
                Próxima aula <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : <div />}
        </div>
      </div>
    </AppLayout>
  );
}
