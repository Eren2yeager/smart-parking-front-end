import { redirect } from 'next/navigation';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import Navbar from '@/components/Navbar';
import ResponsiveSidebar from '@/components/ResponsiveSidebar';
import SkipLinks from '@/components/SkipLinks';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication
  const session = await auth();

  if (!session || !session.user) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Skip Navigation Links */}
      <SkipLinks />

      {/* Responsive Sidebar */}
      <ResponsiveSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* Navbar */}
        <Navbar />

        {/* Page Content */}
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto px-6 py-4 md:px-8 md:py-6" style={{ outline: 'none' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
