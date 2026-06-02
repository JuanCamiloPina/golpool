// Thin server wrapper — resolves the dynamic route param (which is a Promise
// in Next.js 16) and passes the plain string to the client component.
// The admin logic lives in AdminPageClient to use the browser Supabase client,
// which always has the current session (the server client can miss refreshed
// tokens if they were written to the response after the request was read).
import AdminPageClient from './AdminPageClient'

export default async function AdminPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <AdminPageClient poolId={id} />
}
