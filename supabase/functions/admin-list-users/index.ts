import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify caller is admin
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(authHeader.replace('Bearer ', ''))
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const userId = claimsData.claims.sub
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
    }

    // List all auth users
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (error) throw error

    const emailMap: Record<string, { email: string; created_at: string; last_sign_in_at: string | null }> = {}
    for (const u of users) {
      emailMap[u.id] = {
        email: u.email || '',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at || null,
      }
    }

    return new Response(JSON.stringify({ users: emailMap }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
