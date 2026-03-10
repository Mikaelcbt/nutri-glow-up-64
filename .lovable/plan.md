

# JP NutriCare — Complete Platform Rebuild Plan

This is a large-scale transformation covering: new design system, new database tables, new storage buckets, 4 new pages, 2 new admin pages, and restyling of all existing pages.

---

## 1. Database Migrations (new tables + storage buckets)

Create SQL migrations for:

**Tables:**
- `posts` (id uuid PK, user_id ref auth.users, conteudo text, imagem_url text, criado_em timestamptz default now())
- `comentarios` (id uuid PK, post_id ref posts ON DELETE CASCADE, user_id ref auth.users, conteudo text, criado_em timestamptz default now())
- `likes` (id uuid PK, post_id ref posts ON DELETE CASCADE, user_id ref auth.users, criado_em timestamptz default now(), UNIQUE(post_id, user_id))
- `transformacoes` (id uuid PK, user_id ref auth.users, foto_antes_url text, foto_depois_url text, descricao text, aprovado boolean default false, criado_em timestamptz default now())
- `materiais` (id uuid PK, product_id ref products nullable, titulo text, descricao text, arquivo_url text, tipo text default 'pdf', criado_em timestamptz default now())

**RLS policies** for each table as specified.

**Storage buckets** (public): `capas`, `transformacoes`, `materiais`, `avatares`, `comunidade`

---

## 2. Design System Overhaul

Transform from dark/Netflix to light/health premium theme across every file:

**`src/index.css`:** Replace all CSS variables:
- `--background: 40 20% 98%` (#FAFAF7)
- `--foreground: 50 7% 9%` (#1A1A16)  
- `--card: 0 0% 100%` (#FFFFFF)
- `--primary: 142 72% 46%` (#22C55E)
- `--secondary: 40 10% 95%` (#F4F4F0)
- `--muted-foreground` → #6B6B63
- `--border` → #E8E8E2
- New radius: 1rem (16px), softer shadows

**`tailwind.config.ts`:** Update fontFamily to Cormorant Garamond (display) + DM Sans (body)

**`src/index.css`:** Replace Google Fonts import to include Cormorant Garamond instead of Bebas Neue. Update scrollbar colors to light theme.

---

## 3. App Layout — Sidebar Navigation

Replace the current top-nav `AppLayout.tsx` with a **left sidebar**:
- White background, right border #E8E8E2
- Logo "JP NutriCare" in Cormorant Garamond at top
- Nav links: Início, Comunidade, Antes & Depois, Materiais, Perfil
- Active link: green background #DCFCE7, green text
- User avatar + name at bottom
- Sign out button

---

## 4. Updated Pages — App Side

**Login & Register:** Light background #FAFAF7, white card with shadow, green button, Cormorant Garamond title. Same for ForgotPassword/ResetPassword.

**AppHome (`/app`):**
- Hero 80vh with warm white gradient from left over product image on right (55%)
- Tag "Programa em destaque" in green badge
- Title in Cormorant Garamond 64px, #1A1A16
- Buttons: "Continuar programa" (green solid), "Saiba mais" (green outline)
- Progress bar in footer of hero
- Module carousel: 200×320 cards with image bg, white translucent badge, unique accent colors, Cormorant Garamond titles, progress bars, hover elevation with soft shadow
- "Continue de onde parou" section: white cards, soft shadows, green play button on hover

**ProgramPage (`/app/programa/:slug`):** 350px header with gradient, green progress bar, module cards in same carousel style, expandable lessons with green checkmarks.

**LessonPage (`/app/aula/:id`):** White card video player, Cormorant Garamond 40px title, markdown content, green "Marcar como concluída" button, sidebar with lesson list from the module.

**ProfilePage (`/app/perfil`):** Green circular avatar with initial, edit name button, program progress cards with green bars, completed lessons history.

---

## 5. New Pages — App Side

**`/app/comunidade` (CommunityPage):**
- Feed of posts from `posts` table (joined with profiles for avatar/name)
- "Nova publicação" modal: textarea + image upload to `comunidade` bucket
- Each post: avatar initial circle, name, relative time (date-fns `formatDistanceToNow`), text, image, like button with count, comment toggle
- Expandable comments section with inline new comment field
- Own posts show delete button

**`/app/antes-e-depois` (TransformationsPage):**
- Grid of approved transformations from `transformacoes` where `aprovado = true`
- "Enviar minha transformação" modal: upload before + after photos to `transformacoes` bucket + description
- Cards with side-by-side images, user name, description
- Elegant empty state

**`/app/materiais` (MaterialsPage):**
- Grid of materials the user has access to (via associacoes join or product_id IS NULL)
- White cards with file type icon, title, description, green "Baixar" button
- Empty state

---

## 6. Admin Updates

**AdminLayout:** Update sidebar to light theme (white bg, #F4F4F0 content area). Add nav items for Transformações and Materiais.

**`/admin/transformacoes` (AdminTransformations):**
- List all transformations (pending + approved)
- Approve/reject buttons
- Show user name and photos

**`/admin/materiais` (AdminMaterials):**
- CRUD for materials with file upload to `materiais` bucket
- Optional product selector
- Type selector (pdf/planilha/outro)

**Existing admin pages:** Restyle to light theme (white cards, green accents, soft shadows).

---

## 7. Routing Updates

Add to `App.tsx`:
- `/app/comunidade` → CommunityPage
- `/app/antes-e-depois` → TransformationsPage  
- `/app/materiais` → MaterialsPage
- `/admin/transformacoes` → AdminTransformations
- `/admin/materiais` → AdminMaterials

All new `/app/*` routes wrapped in `<ProtectedRoute>`, admin routes in `<AdminRoute>`.

---

## 8. Files to Create/Modify

**New files (~9):**
- `src/pages/CommunityPage.tsx`
- `src/pages/TransformationsPage.tsx`
- `src/pages/MaterialsPage.tsx`
- `src/pages/admin/AdminTransformations.tsx`
- `src/pages/admin/AdminMaterials.tsx`

**Modified files (~15):**
- `src/index.css` — full design system swap
- `tailwind.config.ts` — fonts + colors
- `src/App.tsx` — new routes
- `src/components/AppLayout.tsx` — sidebar nav
- `src/components/AdminLayout.tsx` — light theme + new nav items
- `src/pages/Login.tsx`, `Register.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx` — light theme
- `src/pages/AppHome.tsx` — light hero + cards redesign
- `src/pages/ProgramPage.tsx` — light theme
- `src/pages/LessonPage.tsx` — light theme + sidebar lesson list
- `src/pages/ProfilePage.tsx` — light theme + edit name + history
- All admin CRUD pages — light theme styling

**Database migration:** 1 migration with all 5 tables, RLS policies, and 5 storage buckets.

---

## Technical Notes

- All new pages follow existing patterns: `try/catch/finally`, `toast` for feedback, `Loader2` spinners, `AlertDialog` for confirmations
- Image uploads use same pattern as `AdminProducts` — upload to Supabase Storage, get public URL
- Relative time formatting uses `date-fns` `formatDistanceToNow` with `{ locale: ptBR, addSuffix: true }`
- Community likes use optimistic UI update pattern
- Materials access check: query materials where `product_id IS NULL` OR `product_id IN (user's active associations)`
- No new npm dependencies needed (date-fns already installed)

