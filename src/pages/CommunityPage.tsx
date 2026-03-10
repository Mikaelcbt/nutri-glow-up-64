import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Heart, MessageCircle, Trash2, Loader2, Upload, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Post {
  id: string; user_id: string; conteudo: string; imagem_url: string | null;
  criado_em: string; nome_completo: string; like_count: number; liked: boolean; comment_count: number;
}
interface Comment {
  id: string; user_id: string; conteudo: string; criado_em: string; nome_completo: string;
}

export default function CommunityPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newImage, setNewImage] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [commentingOn, setCommentingOn] = useState<string | null>(null);

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
      const { data: profiles } = await supabase.from('profiles').select('id, nome_completo').in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p.nome_completo || 'Usuário']) || []);

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

      setPosts(rawPosts.map(p => ({
        ...p,
        nome_completo: profileMap.get(p.user_id) || 'Usuário',
        like_count: likeCounts[p.id] || 0,
        liked: userLiked[p.id] || false,
        comment_count: commentCountMap[p.id] || 0,
      })));
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
      setOpen(false); setNewContent(''); setNewImage(null);
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
      const { data: profiles } = await supabase.from('profiles').select('id, nome_completo').in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p.nome_completo || 'Usuário']) || []);
      setComments(prev => ({ ...prev, [postId]: data.map(c => ({ ...c, nome_completo: profileMap.get(c.user_id) || 'Usuário' })) }));
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

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl font-semibold text-foreground">Comunidade</h1>
          <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nova publicação</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-border" />
            <p>Nenhuma publicação ainda. Seja o primeiro!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => {
              const initial = post.nome_completo.charAt(0).toUpperCase();
              return (
                <div key={post.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">{initial}</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{post.nome_completo}</p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.criado_em), { locale: ptBR, addSuffix: true })}</p>
                    </div>
                    {post.user_id === user?.id && (
                      <button onClick={() => deletePost(post.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-foreground mb-3 whitespace-pre-wrap">{post.conteudo}</p>
                  {post.imagem_url && <img src={post.imagem_url} alt="" className="rounded-xl mb-3 max-h-96 w-full object-cover" />}

                  <div className="flex items-center gap-4 border-t border-border pt-3">
                    <button onClick={() => toggleLike(post.id, post.liked)}
                      className={`flex items-center gap-1.5 text-sm transition-colors ${post.liked ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>
                      <Heart className={`h-4 w-4 ${post.liked ? 'fill-primary' : ''}`} /> {post.like_count}
                    </button>
                    <button onClick={() => loadComments(post.id)}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <MessageCircle className="h-4 w-4" /> {post.comment_count}
                    </button>
                  </div>

                  {expandedComments === post.id && (
                    <div className="mt-3 border-t border-border pt-3 space-y-3">
                      {(comments[post.id] || []).map(c => (
                        <div key={c.id} className="flex gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">{c.nome_completo.charAt(0).toUpperCase()}</div>
                          <div className="flex-1 rounded-xl bg-secondary p-2.5">
                            <p className="text-xs font-semibold text-foreground">{c.nome_completo}</p>
                            <p className="text-sm text-foreground mt-0.5">{c.conteudo}</p>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input value={newComment} onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addComment(post.id)}
                          placeholder="Escreva um comentário..." className="flex-1 rounded-xl bg-secondary px-3 py-2 text-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                        <Button size="sm" onClick={() => addComment(post.id)} disabled={commentingOn === post.id}>
                          {commentingOn === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="font-display text-2xl">Nova publicação</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea placeholder="O que você quer compartilhar?" value={newContent}
              onChange={(e) => setNewContent(e.target.value)} rows={4} className="bg-secondary border-border" />
            <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Upload className="h-4 w-4" />
              {newImage ? newImage.name : 'Adicionar imagem'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setNewImage(e.target.files?.[0] || null)} />
            </label>
            <Button onClick={createPost} disabled={posting || !newContent.trim()} className="w-full">
              {posting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publicando...</> : 'Publicar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
