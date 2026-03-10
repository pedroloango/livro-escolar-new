
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { NavBar } from './NavBar';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <NavBar />
      <div className="flex">
        <Sidebar />
        <main className="w-full flex-1 md:ml-56 py-6 px-4 sm:px-6 lg:px-8 fade-in-animation">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
