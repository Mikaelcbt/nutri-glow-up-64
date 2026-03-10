import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Heart, MessageCircle, Trash2, Loader2, Upload, Send, TrendingUp, Users, Flame, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedPage, fadeInUp, staggerContainer } from '@/components/AnimatedPage';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Post {
  id: string; user_id: string; conteudo: string; imagem_url: string | null;
  criado_em: string; nome_completo: string; avatar_url: string | null;
  like_count: number; liked: boolean; comment_count: number;
}
interface Comment {
  id: string; user_id: string; conteudo: string; criado_em: string;
  nome_completo: string; avatar_url: string | null;
}

export default function CommunityPage() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recentes' | 'populares'>('recentes');

  useEffect(() => { loadPosts(); }, [user]);

  const loadPosts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: rawPosts, error } = await supabase
        .from('posts').select('*').order('criado_em', { ascending: false });
      if (error) throw error;
      if (!rawPosts?.length) { setPosts([]); return; }

      const userIds = [...new Set(rawPosts.map(p => p.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, nome_completo, avatar_url').in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, { nome: p.nome_completo || 'Usuário', avatar: p.avatar_url }]) || []);

      const postIds = rawPosts.map(p => p.id);
      const { data: likes } = await supabase.from('likes').select('post_id, user_id').in('post_id', postIds);
      const { data: commentCounts } = await supabase.from('comentarios').select('post_id').in('post_id', postIds);

      const likeCounts: Record<string, number> = {};
      const userLiked: Record<string, boolean> = {};
      likes?.forEach(l => {
        likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1;
        if (l.user_id === user.id) userLiked[l.post_id] = true;
      });

      const commentCountMap: Record<string, number> = {};
      commentCounts?.forEach(c => { commentCountMap[c.post_id] = (commentCountMap[c.post_id] || 0) + 1; });

      setPosts(rawPosts.map(p => {
        const prof = profileMap.get(p.user_id);
        return {
          ...p,
          nome_completo: prof?.nome || 'Usuário',
          avatar_url: prof?.avatar || null,
          like_count: likeCounts[p.id] || 0,
          liked: userLiked[p.id] || false,
          comment_count: commentCountMap[p.id] || 0,
        };
      }));
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar posts');
    } finally { setLoading(false); }
  };

  const createPost = async () => {
    if (!user || !newContent.trim()) return;
    setPosting(true);
    try {
      let imagem_url = null;
      if (newImage) {
        const ext = newImage.name.split('.').pop();
        const path = `comunidade/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('comunidade').upload(path, newImage);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('comunidade').getPublicUrl(path);
        imagem_url = urlData.publicUrl;
      }
      const { error } = await supabase.from('posts').insert({ user_id: user.id, conteudo: newContent.trim(), imagem_url });
      if (error) throw error;
      toast.success('Publicação criada!');
      setOpen(false); setNewContent(''); setNewImage(null); setImagePreview(null);
      await loadPosts();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao publicar');
    } finally { setPosting(false); }
  };

  const toggleLike = async (postId: string, liked: boolean) => {
    if (!user) return;
    try {
      if (liked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
      }
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, liked: !liked, like_count: p.like_count + (liked ? -1 : 1) } : p
      ));
    } catch (err) { console.error(err); }
  };

  const deletePost = async (postId: string) => {
    try {
      await supabase.from('posts').delete().eq('id', postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Post excluído');
    } catch (err) { console.error(err); }
  };

  const loadComments = async (postId: string) => {
    if (expandedComments === postId) { setExpandedComments(null); return; }
    setExpandedComments(postId);
    if (comments[postId]) return;
    try {
      const { data } = await supabase.from('comentarios').select('*').eq('post_id', postId).order('criado_em');
      if (!data?.length) { setComments(prev => ({ ...prev, [postId]: [] })); return; }
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, nome_completo, avatar_url').in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, { nome: p.nome_completo || 'Usuário', avatar: p.avatar_url }]) || []);
      setComments(prev => ({
        ...prev,
        [postId]: data.map(c => {
          const prof = profileMap.get(c.user_id);
          return { ...c, nome_completo: prof?.nome || 'Usuário', avatar_url: prof?.avatar || null };
        })
      }));
    } catch (err) { console.error(err); }
  };

  const addComment = async (postId: string) => {
    if (!user || !newComment.trim()) return;
    setCommentingOn(postId);
    try {
      const { error } = await supabase.from('comentarios').insert({ post_id: postId, user_id: user.id, conteudo: newComment.trim() });
      if (error) throw error;
      setNewComment('');
      setComments(prev => ({ ...prev, [postId]: undefined as any }));
      await loadComments(postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p));
    } catch (err: any) {
      toast.error(err.message || 'Erro ao comentar');
    } finally { setCommentingOn(null); }
  };

  const handleImageSelect = (file: File | null) => {
    setNewImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const sortedPosts = activeTab === 'populares'
    ? [...posts].sort((a, b) => b.like_count - a.like_count)
    : posts;

  const topPost = posts.length > 0 ? [...posts].sort((a, b) => b.like_count - a.like_count)[0] : null;

  const stats = {
    totalPosts: posts.length,
    totalLikes: posts.reduce((s, p) => s + p.like_count, 0),
    totalComments: posts.reduce((s, p) => s + p.comment_count, 0),
  };

  return (
    <AppLayout>
      <AnimatedPage>
        {/* ── Hero Netflix-style ── */}
        {!loading && topPost && (
          <motion.section
            className="relative w-full overflow-hidden"
            style={{ minHeight: '50vh' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            {/* Background */}
            <div className="absolute inset-0">
              {topPost.imagem_url ? (
                <img src={topPost.imagem_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-primary/20 via-accent to-primary/10" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/30" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />
            </div>

            <div className="relative flex items-end h-full px-6 pb-8 pt-16 md:px-12 lg:px-16" style={{ minHeight: '50vh' }}>
              <motion.div
                className="max-w-xl space-y-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-widest text-primary">Post em destaque</span>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/30">
                    {topPost.avatar_url ? (
                      <AvatarImage src={topPost.avatar_url} alt={topPost.nome_completo} />
                    ) : null}
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                      {topPost.nome_completo.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{topPost.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(topPost.criado_em), { locale: ptBR, addSuffix: true })}
                    </p>
                  </div>
                </div>
                <p className="text-lg text-foreground leading-relaxed line-clamp-3">{topPost.conteudo}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Heart className="h-4 w-4 text-primary fill-primary" /> {topPost.like_count} curtidas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" /> {topPost.comment_count} comentários
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.section>
        )}

        {/* ── Stats bar ── */}
        {!loading && posts.length > 0 && (
          <motion.div
            className="px-6 md:px-12 lg:px-16 py-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="grid grid-cols-3 gap-4 max-w-lg">
              {[
                { label: 'Publicações', value: stats.totalPosts, icon: TrendingUp },
                { label: 'Curtidas', value: stats.totalLikes, icon: Heart },
                { label: 'Comentários', value: stats.totalComments, icon: MessageCircle },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="flex items-center gap-3 rounded-xl bg-card border border-border p-4 shadow-card"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
                    <stat.icon className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Main content ── */}
        <div className="max-w-2xl mx-auto px-4 pb-12">
          {/* Header + Tabs */}
          <motion.div variants={fadeInUp} initial="initial" animate="animate" className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setActiveTab('recentes')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'recentes' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Recentes
                </button>
                <button
                  onClick={() => setActiveTab('populares')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'populares' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Populares
                </button>
              </div>
            </div>
            <Button onClick={() => setOpen(true)} className="active:scale-[0.97] transition-transform shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> Nova publicação
            </Button>
          </motion.div>

          {/* ── Compose inline card ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-border bg-card p-4 mb-6 shadow-card cursor-pointer hover:shadow-soft transition-shadow"
            onClick={() => setOpen(true)}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.nome_completo || ''} /> : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                  {profile?.nome_completo?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm text-muted-foreground flex-1">No que você está pensando?</p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
              </div>
            </div>
          </motion.div>

          {/* ── Posts ── */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full shimmer" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28 shimmer" />
                      <Skeleton className="h-3 w-16 shimmer" />
                    </div>
                  </div>
                  <Skeleton className="h-20 w-full shimmer" />
                  <Skeleton className="h-48 w-full rounded-xl shimmer" />
                </div>
              ))}
            </div>
          ) : sortedPosts.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent mb-4">
                <Users className="h-8 w-8 text-accent-foreground" />
              </div>
              <h3 className="font-display text-2xl font-semibold text-foreground mb-2">Nenhuma publicação ainda</h3>
              <p className="text-muted-foreground mb-6">Seja o primeiro a compartilhar algo com a comunidade!</p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Criar publicação
              </Button>
            </motion.div>
          ) : (
            <motion.div className="space-y-5" variants={staggerContainer} initial="initial" animate="animate">
              {sortedPosts.map((post, idx) => {
                const initial = post.nome_completo.charAt(0).toUpperCase();
                return (
                  <motion.div
                    key={post.id}
                    variants={fadeInUp}
                    className="rounded-2xl border border-border bg-card overflow-hidden shadow-card hover:shadow-soft transition-all duration-300"
                  >
                    {/* Post header */}
                    <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                      <Avatar className="h-10 w-10 ring-2 ring-border">
                        {post.avatar_url ? (
                          <AvatarImage src={post.avatar_url} alt={post.nome_completo} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{post.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(post.criado_em), { locale: ptBR, addSuffix: true })}
                        </p>
                      </div>
                      {post.user_id === user?.id && (
                        <button onClick={() => deletePost(post.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <div className="px-5 pb-3">
                      <p className="text-foreground whitespace-pre-wrap leading-relaxed">{post.conteudo}</p>
                    </div>

                    {/* Image */}
                    {post.imagem_url && (
                      <motion.div
                        className="relative overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <img
                          src={post.imagem_url}
                          alt=""
                          className="w-full max-h-[500px] object-cover hover:scale-[1.02] transition-transform duration-500"
                        />
                      </motion.div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 px-5 py-3 border-t border-border">
                      <motion.button
                        onClick={() => toggleLike(post.id, post.liked)}
                        whileTap={{ scale: 1.3 }}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${post.liked ? 'text-primary bg-accent' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                      >
                        <Heart className={`h-4 w-4 ${post.liked ? 'fill-primary' : ''}`} /> {post.like_count}
                      </motion.button>
                      <button
                        onClick={() => loadComments(post.id)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${expandedComments === post.id ? 'text-primary bg-accent' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                      >
                        <MessageCircle className="h-4 w-4" /> {post.comment_count}
                      </button>
                    </div>

                    {/* Comments */}
                    <AnimatePresence>
                      {expandedComments === post.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border px-5 py-4 bg-secondary/30 space-y-3">
                            {(comments[post.id] || []).map(c => (
                              <div key={c.id} className="flex gap-2.5">
                                <Avatar className="h-7 w-7 flex-shrink-0">
                                  {c.avatar_url ? (
                                    <AvatarImage src={c.avatar_url} alt={c.nome_completo} className="object-cover" />
                                  ) : null}
                                  <AvatarFallback className="bg-muted text-foreground text-[10px] font-bold">
                                    {c.nome_completo.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 rounded-xl bg-card border border-border p-3">
                                  <div className="flex items-baseline gap-2">
                                    <p className="text-xs font-semibold text-foreground">{c.nome_completo}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {formatDistanceToNow(new Date(c.criado_em), { locale: ptBR, addSuffix: true })}
                                    </p>
                                  </div>
                                  <p className="text-sm text-foreground mt-1">{c.conteudo}</p>
                                </div>
                              </div>
                            ))}
                            {(comments[post.id] || []).length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-2">Nenhum comentário ainda</p>
                            )}
                            <div className="flex gap-2 pt-1">
                              <Avatar className="h-7 w-7 flex-shrink-0">
                                {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" className="object-cover" /> : null}
                                <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
                                  {profile?.nome_completo?.charAt(0)?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <input
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addComment(post.id)}
                                placeholder="Escreva um comentário..."
                                className="flex-1 rounded-xl bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
                              />
                              <Button size="sm" onClick={() => addComment(post.id)} disabled={commentingOn === post.id} className="active:scale-[0.97] transition-transform">
                                {commentingOn === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* ── New Post Dialog ── */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-card border-border sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Nova publicação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-9 w-9 mt-1">
                  {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                    {profile?.nome_completo?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{profile?.nome_completo || 'Usuário'}</p>
                  <Textarea
                    placeholder="Compartilhe algo com a comunidade..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={4}
                    className="mt-2 bg-secondary border-border resize-none"
                  />
                </div>
              </div>

              {imagePreview && (
                <div className="relative rounded-xl overflow-hidden">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-60 object-cover rounded-xl" />
                  <button
                    onClick={() => { setNewImage(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-foreground/60 text-background flex items-center justify-center hover:bg-foreground/80 transition-colors text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border pt-3">
                <label className="flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                  <ImageIcon className="h-4 w-4" />
                  Foto
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e.target.files?.[0] || null)} />
                </label>
                <Button onClick={createPost} disabled={posting || !newContent.trim()} className="active:scale-[0.97] transition-transform px-6">
                  {posting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publicando...</> : 'Publicar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </AnimatedPage>
    </AppLayout>
  );
}
