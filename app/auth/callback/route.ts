import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Handles all PKCE auth callbacks: email confirmation, OAuth, and password reset.
// For password reset the flow is:
//   1. forgot-password calls resetPasswordForEmail with redirectTo=/auth/callback?next=/auth/reset-password
//   2. Supabase emails a link → user clicks → lands here with ?code=…&type=recovery
//   3. Code is exchanged for a session (sets cookie), then redirected to /auth/reset-password
//   4. The proxy exempts /auth/reset-password so the recovery session isn't bounced to /dashboard
//   5. reset-password calls getSession() to confirm the session, then updateUser({ password })
//
// Required Supabase dashboard settings:
//   Authentication → URL Configuration → Redirect URLs:
//     https://golpool-one.vercel.app/auth/callback
//     http://localhost:3000/auth/callback

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Recovery sessions go to reset-password regardless of the next param.
      // The proxy exempts /auth/reset-password so the session cookie is not
      // mistaken for a normal login and bounced to /dashboard.
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
