'use client';
import { usePathname } from 'next/navigation';
import { AuthModalProvider } from '@/components/auth/AuthModalProvider';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
export function WebsiteShell({children}:{children:React.ReactNode}) {
  const pathname=usePathname();
  if(pathname.startsWith('/admin')) return <>{children}</>;
  return <AuthModalProvider><Navbar/><main id="main-content" className="flex-1">{children}</main><Footer/></AuthModalProvider>;
}
