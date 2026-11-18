import { AdminOverview } from '@/components/admin/AdminOverview';
import { hasCabAdmin } from '@/lib/cab/security';
import { redirect } from 'next/navigation';
export default async function Page(){
  if (!(await hasCabAdmin())) redirect('/admin/login');
  return <AdminOverview/>;
}
