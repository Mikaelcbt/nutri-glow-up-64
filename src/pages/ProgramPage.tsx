import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import Breadcrumb from '@/components/Breadcrumb';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, Play, CheckCircle2 } from 'lucide-react';

interface Product { id: string; nome: string; slug: string; descricao: string; imagem_capa_url: string; cor_destaque: string; }
interface Module { id: string; titulo: string; descricao: string; ordem: number; texto_destaque_palavra: string; cor_destaque: string; }
interface Lesson { id: string; titulo: string; descricao: string; ordem: number; is_preview: boolean; }

export default function ProgramPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [moduleLessons, setModuleLessons] = useState<Record<string, Lesson[]>>({});
  const [overallProgress, setOverallProgress] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (slug) loadProduct(); }, [slug, user]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const { data: prod } = await supabase.from('products').select('*').eq('slug', slug).eq('is_active', true).maybeSingle();
      if (!prod) { setLoading(false); return; }
      setProduct(prod);
      const { data: mods } = await supabase.from('modules').select('*').eq('product_id', prod.id).order('ordem');
      if (mods) {
        setModules(mods);
        const modIds = mods.map(m => m.id);
        const { data: allLessons } = await supabase.from('lessons').select('id, module_id').in('module_id', modIds);
        if (user && allLessons) {
          const { data: progress } = await supabase.from('rastreamento_progresso').select('lesson_id').eq('user_id', user.id).eq('concluido', true);
          const completed = new Set<string>(progress?.map(p => p.lesson_id as string) || []);
          setCompletedLessons(completed);
          const total = allLessons.length;
          const done = allLessons.filter(l => completed.has(l.id)).length;
          setOverallProgress(total > 0 ? (done / total) * 100 : 0);
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toggleModule = async (moduleId: string) => {
    if (expandedModule === moduleId) { setExpandedModule(null); return; }
    setExpandedModule(moduleId);
    if (!moduleLessons[moduleId]) {
      const { data: lessons } = await supabase.from('lessons').select('*').eq('module_id', moduleId).order('ordem');
      if (lessons) setModuleLessons(prev => ({ ...prev, [moduleId]: lessons }));
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4 px-8 py-8 md:px-16">
          <Skeleton className="h-[350px] w-full rounded-2xl" />
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      </AppLayout>
    );
  }

  if (!product) {
    return (
      <AppLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <p className="text-muted-foreground">Programa não encontrado.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Breadcrumb items={[
        { label: 'Início', href: '/app' },
        { label: product.nome },
      ]} />

      {/* Header */}
      <section className="relative overflow-hidden" style={{ height: 350 }}>
        <img src={product.imagem_capa_url || '/placeholder.svg'} alt={product.nome} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-8 left-8 md:left-16 space-y-4">
          <h1 className="font-display text-5xl md:text-6xl font-semibold text-foreground">{product.nome}</h1>
          <p className="max-w-xl text-muted-foreground">{product.descricao}</p>
          <div className="flex items-center gap-4 max-w-md">
            <Progress value={overallProgress} className="h-2 flex-1" />
            <span className="text-sm text-primary font-bold">{Math.round(overallProgress)}%</span>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="px-8 py-12 md:px-16">
        <h2 className="mb-8 font-display text-3xl font-semibold text-foreground">Módulos</h2>
        <div className="space-y-4">
          {modules.map((mod, i) => (
            <div key={mod.id} className="rounded-2xl border border-border bg-card shadow-card overflow-hidden transition-shadow hover:shadow-soft">
              <button
                onClick={() => toggleModule(mod.id)}
                className="flex w-full items-center justify-between p-5 text-left hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-card"
                    style={{ backgroundColor: mod.cor_destaque || '#22C55E' }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-foreground">{mod.titulo}</h3>
                    <p className="text-sm text-muted-foreground">{mod.descricao}</p>
                  </div>
                </div>
                <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${expandedModule === mod.id ? 'rotate-90' : ''}`} />
              </button>

              {expandedModule === mod.id && moduleLessons[mod.id] && (
                <div className="border-t border-border p-5 bg-secondary/30">
                  <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                    {moduleLessons[mod.id].map((lesson) => (
                      <Link
                        key={lesson.id}
                        to={`/app/aula/${lesson.id}`}
                        className="group flex-shrink-0 w-56 rounded-xl bg-card border border-border overflow-hidden hover:shadow-soft transition-all duration-200"
                      >
                        <div className="aspect-video bg-secondary flex items-center justify-center relative">
                          <Play className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                          {completedLessons.has(lesson.id) && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <h4 className="text-sm font-semibold truncate text-foreground">{lesson.titulo}</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lesson.descricao}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}