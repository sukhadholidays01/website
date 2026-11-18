'use client';
import { usePathname } from 'next/navigation';
import { AuthModalProvider } from '@/components/auth/AuthModalProvider';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { AnnouncementStrip } from './AnnouncementStrip';
export function WebsiteShell({children}:{children:React.ReactNode}) {
  const pathname=usePathname();
  if(pathname.startsWith('/admin')) return <>{children}</>;
  if(pathname === '/cabs/driver') return <main id="main-content" className="flex-1">{children}</main>;
  return <AuthModalProvider promptOnFirstVisit={pathname==='/'}><Navbar/><AnnouncementStrip/><main id="main-content" className="flex-1">{children}</main><Footer/></AuthModalProvider>;
}
