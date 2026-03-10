
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import { 
  Sheet,
  SheetContent,
  SheetTrigger
} from '@/components/ui/sheet';
import { SidebarContent } from './Sidebar';

export function NavBar() {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 sm:px-6 gap-2">
        <div className="md:hidden shrink-0">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-56 p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-foreground truncate">Biblioteca Escolar</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Sair">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
