import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

function checkAdmin(email: string | undefined): boolean {
  if (!email) return false
  const list = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase())
  return list.includes(email.toLowerCase())
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return NextResponse.json({ isAdmin: checkAdmin(user?.email) })
}
