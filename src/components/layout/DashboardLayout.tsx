
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
    <div className="min-h-screen">
      <NavBar />
      <div className="flex">
        <Sidebar />
        <main className="md:pl-64 w-full py-8 px-4 container max-w-7xl fade-in-animation">
          {children}
        </main>
      </div>
    </div>
  );
}
