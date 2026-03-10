import { Link, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  BookPlus, 
  Home, 
  HelpCircle, 
  LayoutDashboard, 
  FileSpreadsheet, 
  Reply, 
  ShieldCheck,
  School as SchoolIcon,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';

// Tipo para os links da barra lateral
interface SidebarLink {
  href: string;
  icon: React.ElementType;
  title: string;
  adminOnly?: boolean;
}

// Lista de links
const links: SidebarLink[] = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard',
  },
  {
    href: '/students',
    icon: Users,
    title: 'Alunos',
  },
  {
    href: '/teachers',
    icon: GraduationCap,
    title: 'Professores',
  },
  {
    href: '/books',
    icon: BookOpen,
    title: 'Livros',
  },
  {
    href: '/loans',
    icon: BookPlus,
    title: 'Empréstimos',
  },
  {
    href: '/returns',
    icon: Reply,
    title: 'Devoluções',
  },
  {
    href: '/admin/schools',
    icon: SchoolIcon,
    title: 'Escolas',
    adminOnly: true
  },
  {
    href: '/admin/users',
    icon: ShieldCheck,
    title: 'Usuários',
    adminOnly: true
  },
  {
    href: '/storytelling',
    icon: BookOpen,
    title: 'Contação de histórias',
  },
];

// Componente de conteúdo da barra lateral que pode ser reutilizado
export function SidebarContent() {
  const { pathname } = useLocation();
  const { isAdmin } = useAuth();

  // Filtrar links com base no papel do usuário
  const filteredLinks = links.filter(link => !link.adminOnly || (link.adminOnly && isAdmin));

  return (
    <div className="flex flex-col h-full">
      <Link to="/dashboard" className="flex items-center gap-2 px-3 py-4 border-b border-border/40">
        <BookOpen className="h-5 w-5 text-primary shrink-0" />
        <span className="text-sm font-semibold text-primary truncate">Biblioteca</span>
      </Link>
      <ScrollArea className="flex-1 px-2">
        <nav className="grid gap-0.5 p-2 py-3" aria-label="Menu principal">
          {filteredLinks.map((link) => (
            <Link key={link.href} to={link.href}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-start gap-2 h-9 text-muted-foreground hover:text-foreground",
                  pathname === link.href && "bg-muted text-foreground font-medium"
                )}
              >
                <link.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{link.title}</span>
              </Button>
            </Link>
          ))}
        </nav>
      </ScrollArea>
      <div className="p-2 mt-auto border-t border-border/40">
        <Link to="/help">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-muted-foreground">
            <HelpCircle className="h-4 w-4 shrink-0" aria-hidden />
            Ajuda
          </Button>
        </Link>
      </div>
    </div>
  );
}

// Componente principal da barra lateral
export function Sidebar() {
  return (
    <div className="fixed left-0 top-14 z-20 hidden h-[calc(100vh-3.5rem)] w-56 border-r border-border/40 bg-background shadow-sm md:block">
      <SidebarContent />
    </div>
  );
}

// Mantemos o export default para compatibilidade
export default function SidebarDefault() {
  return <Sidebar />;
}
