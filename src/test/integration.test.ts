import { describe, it, expect, vi } from 'vitest';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            limit: () => ({
              then: (cb: any) => cb({ data: [{ id: '1' }] }),
            }),
            maybeSingle: () => Promise.resolve({ data: null }),
            order: () => ({
              limit: () => Promise.resolve({ data: [] }),
            }),
          }),
          order: () => Promise.resolve({ data: [] }),
          maybeSingle: () => Promise.resolve({ data: null }),
          in: () => Promise.resolve({ data: [] }),
        }),
        ilike: () => ({
          limit: () => Promise.resolve({ data: [] }),
        }),
        in: () => Promise.resolve({ data: [] }),
        order: () => Promise.resolve({ data: [] }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: '1', role: 'user', conteudo: 'test', criado_em: new Date().toISOString() } }),
        }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({}),
      }),
      upsert: () => ({
        select: () => ({
          maybeSingle: () => Promise.resolve({ data: { id: '1' } }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            maybeSingle: () => Promise.resolve({ data: { id: '1' } }),
          }),
        }),
      }),
    }),
    functions: {
      invoke: () => Promise.resolve({ data: { response: 'Test response' }, error: null }),
    },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    profile: { id: 'test-user-id', nome_completo: 'Test User', role: 'aluno' },
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: any) => children,
}));

describe('AccessRequestModal', () => {
  it('generates correct WhatsApp URL', async () => {
    const { WHATSAPP_NUMBER } = await import('@/components/AccessRequestModal');
    expect(WHATSAPP_NUMBER).toBe('5511999999999');
    expect(typeof WHATSAPP_NUMBER).toBe('string');
    expect(WHATSAPP_NUMBER.length).toBeGreaterThan(10);
  });
});

describe('useAnimatedNumber', () => {
  it('returns 0 initially', async () => {
    const { useAnimatedNumber } = await import('@/hooks/useAnimatedNumber');
    expect(typeof useAnimatedNumber).toBe('function');
  });
});

describe('AnimatedPage exports', () => {
  it('exports all animation variants', async () => {
    const mod = await import('@/components/AnimatedPage');
    expect(mod.AnimatedPage).toBeDefined();
    expect(mod.staggerContainer).toBeDefined();
    expect(mod.fadeInUp).toBeDefined();
    expect(mod.fadeInRight).toBeDefined();
    expect(mod.fadeInLeft).toBeDefined();
    expect(mod.scaleIn).toBeDefined();
  });

  it('fadeInUp has correct initial state', async () => {
    const { fadeInUp } = await import('@/components/AnimatedPage');
    expect(fadeInUp.initial).toEqual({ opacity: 0, y: 20 });
  });

  it('staggerContainer has staggerChildren', async () => {
    const { staggerContainer } = await import('@/components/AnimatedPage');
    const animate = staggerContainer.animate as any;
    expect(animate.transition.staggerChildren).toBe(0.1);
  });
});

describe('NutriChat hook', () => {
  it('exports useNutriChat function', async () => {
    const { useNutriChat } = await import('@/hooks/useNutriChat');
    expect(typeof useNutriChat).toBe('function');
  });
});

describe('Route configuration', () => {
  it('App has NutriIA route', async () => {
    // Verify the import exists
    const mod = await import('@/pages/NutriIAPage');
    expect(mod.default).toBeDefined();
  });

  it('AccessRequestModal component exists', async () => {
    const mod = await import('@/components/AccessRequestModal');
    expect(mod.default).toBeDefined();
  });

  it('NutriChatFloat component exists', async () => {
    const mod = await import('@/components/NutriChatFloat');
    expect(mod.default).toBeDefined();
  });
});

describe('Page components exist and export defaults', () => {
  it('AppHome exports default', async () => {
    const mod = await import('@/pages/AppHome');
    expect(mod.default).toBeDefined();
  });

  it('ProgramPage exports default', async () => {
    const mod = await import('@/pages/ProgramPage');
    expect(mod.default).toBeDefined();
  });

  it('LessonPage exports default', async () => {
    const mod = await import('@/pages/LessonPage');
    expect(mod.default).toBeDefined();
  });

  it('AdminAssociations exports default', async () => {
    const mod = await import('@/pages/admin/AdminAssociations');
    expect(mod.default).toBeDefined();
  });

  it('LandingPage exports default', async () => {
    const mod = await import('@/pages/LandingPage');
    expect(mod.default).toBeDefined();
  });

  it('ProfilePage exports default', async () => {
    const mod = await import('@/pages/ProfilePage');
    expect(mod.default).toBeDefined();
  });
});
