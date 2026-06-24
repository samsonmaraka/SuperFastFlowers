import Link from 'next/link';
import { signIn } from '@/auth';
import { AdminShell } from '@/components/admin/admin-shell';
import { getCurrentUserWithRoles } from '@/lib/current-user';
import { requireDashboardAccess } from '@/lib/admin-auth';

export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false }
};
export const dynamic='force-dynamic'; export const revalidate=0;
export default async function AdminLayout({children}:{children:React.ReactNode}){
 const current=await getCurrentUserWithRoles();
 if(!current) return <div className="mx-auto max-w-2xl px-4 py-10"><h1 className="mb-3 text-3xl font-semibold">Admin sign-in required</h1><p className="mb-6 text-ink/70">Sign in with an admin Google account. Customers can still browse and checkout without signing in.</p><form action={async()=>{'use server'; await signIn('google',{redirectTo:'/admin'});}}><button className="rounded bg-ink px-4 py-2 font-semibold text-white">Sign in with Google</button></form></div>;
 let access; try{access=await requireDashboardAccess();}catch{return <div className="mx-auto max-w-2xl px-4 py-10"><h1 className="mb-3 text-3xl font-semibold">Unauthorized</h1><p className="mb-6 text-ink/70">Your account is signed in but does not have admin access.</p><Link href="/" className="rounded bg-ink px-4 py-2 font-semibold text-white">Return to shop</Link></div>}
 return <AdminShell access={access}>{children}</AdminShell>;
}
