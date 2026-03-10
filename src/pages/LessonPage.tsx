import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle, Loader2, Play } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface LessonData {
  id: string; titulo: string; descricao: string; conteudo: string;
  video_url: string; ordem: number; module_id: string;
}
interface SiblingLesson { id: string; titulo: string; ordem: number; }

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [completed, setCompleted] = useState(false);
  const [marking, setMarking] = useState(false);
  const [siblings, setSiblings] = useState<{ prev: string | null; next: string | null }>({ prev: null, next: null });
  const [moduleLessons, setModuleLessons] = useState<SiblingLesson[]>([]);

  useEffect(() => { if (id) loadLesson(); }, [id, user]);

  const loadLesson = async () => {
    setLesson(null);
    try {
      const { data, error } = await supabase.from('lessons').select('*').eq('id', id).maybeSingle();
      if (error) { toast.error('Erro ao carregar aula: ' + error.message); return; }
      if (!data) return;
      setLesson(data);

      if (user) {
        const { data: prog } = await supabase.from('rastreamento_progresso')
          .select('concluido').eq('user_id', user.id).eq('lesson_id', data.id).maybeSingle();
        setCompleted(prog?.concluido || false);
        if (!prog) {
          await supabase.from('rastreamento_progresso').upsert(
            { user_id: user.id, lesson_id: data.id, concluido: false },
            { onConflict: 'user_id,lesson_id' }
          );
        }
      }

      const { data: allLessons } = await supabase.from('lessons')
        .select('id, titulo, ordem').eq('module_id', data.module_id).order('ordem');
      if (allLessons) {
        setModuleLessons(allLessons);
        const idx = allLessons.findIndex(l => l.id === data.id);
        setSiblings({
          prev: idx > 0 ? allLessons[idx - 1].id : null,
          next: idx < allLessons.length - 1 ? allLessons[idx + 1].id : null,
        });
      }
    } catch (err) { console.error(err); }
  };

  const markComplete = async () => {
    if (!user || !lesson) return;
    setMarking(true);
    try {
      const { error } = await supabase.from('rastreamento_progresso').upsert(
        { user_id: user.id, lesson_id: lesson.id, concluido: true, concluido_em: new Date().toISOString() },
        { onConflict: 'user_id,lesson_id' }
      );
      if (error) { toast.error('Erro ao salvar progresso: ' + error.message); return; }
      setCompleted(true);
      toast.success('Aula concluída! 🎉');
    } finally { setMarking(false); }
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
      <div className="flex flex-col lg:flex-row">
        {/* Main content */}
        <div className="flex-1 max-w-4xl mx-auto px-4 py-8 lg:px-8">
          {lesson.video_url && (
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-card mb-8 shadow-soft border border-border">
              <iframe src={lesson.video_url} className="h-full w-full" allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture" />
            </div>
          )}

          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-4xl font-semibold text-foreground">{lesson.titulo}</h1>
              <p className="mt-2 text-muted-foreground">{lesson.descricao}</p>
            </div>
            <Button
              onClick={markComplete} disabled={completed || marking}
              variant={completed ? 'outline' : 'default'}
              className={`flex-shrink-0 ${completed ? 'border-primary text-primary' : ''}`}
            >
              {marking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                : <><CheckCircle className="mr-2 h-4 w-4" /> {completed ? 'Concluída ✓' : 'Marcar como concluída'}</>}
            </Button>
          </div>

          {lesson.conteudo && (
            <div className="prose max-w-none mb-12 prose-headings:font-display prose-a:text-primary prose-headings:text-foreground text-foreground">
              <ReactMarkdown>{lesson.conteudo}</ReactMarkdown>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-6">
            {siblings.prev ? (
              <Button asChild variant="outline">
                <Link to={`/app/aula/${siblings.prev}`}><ChevronLeft className="mr-2 h-4 w-4" /> Aula anterior</Link>
              </Button>
            ) : <div />}
            {siblings.next ? (
              <Button asChild>
                <Link to={`/app/aula/${siblings.next}`}>Próxima aula <ChevronRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            ) : <div />}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-80 border-l border-border bg-card p-4 hidden lg:block">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Aulas do módulo</h3>
          <div className="space-y-1">
            {moduleLessons.map((l) => (
              <Link
                key={l.id}
                to={`/app/aula/${l.id}`}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  l.id === lesson.id ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Play className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{l.titulo}</span>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}
