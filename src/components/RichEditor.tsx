import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading2, Heading3, Minus, FileUp } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface RichEditorProps {
  label: string;
  emoji?: string;
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichEditor({ label, emoji, content, onChange, placeholder }: RichEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[100px] p-3 focus:outline-none text-sm [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold',
      },
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML() && content !== undefined) {
      editor.commands.setContent(content || '');
    }
  }, [content]);

  const handleDocImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    if (file.name.endsWith('.txt')) {
      const text = await file.text();
      editor.commands.setContent(`<p>${text.replace(/\n/g, '</p><p>')}</p>`);
      onChange(editor.getHTML());
      toast.success('Texto importado!');
    } else if (file.name.endsWith('.docx')) {
      try {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        editor.commands.setContent(result.value);
        onChange(editor.getHTML());
        toast.success('Documento importado!');
      } catch {
        toast.error('Erro ao importar documento');
      }
    } else {
      toast.error('Formato não suportado. Use .txt ou .docx');
    }
    e.target.value = '';
  };

  if (!editor) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          {emoji && <span>{emoji}</span>} {label}
        </Label>
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => fileRef.current?.click()}>
          <FileUp className="h-3 w-3 mr-1" /> Importar
          <input ref={fileRef} type="file" accept=".txt,.docx" className="hidden" onChange={handleDocImport} />
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 p-1 rounded-t-lg border border-border border-b-0 bg-muted/30">
        {[
          { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
          { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
          { icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline') },
          { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
          { icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }) },
          { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
          { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
          { icon: Minus, action: () => editor.chain().focus().setHorizontalRule().run(), active: false },
        ].map(({ icon: Icon, action, active }, i) => (
          <button
            key={i}
            type="button"
            onClick={action}
            className={`p-1.5 rounded transition-colors ${active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="rounded-b-lg border border-border bg-background">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
