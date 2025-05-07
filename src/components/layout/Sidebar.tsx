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
      <Link to="/dashboard" className="flex items-center gap-2 px-4 py-6">
        <BookOpen className="h-6 w-6 text-primary" />
        <div className="text-xl font-semibold text-primary">Biblioteca</div>
      </Link>
      <ScrollArea className="flex-1 px-2">
        <div className="grid gap-1 p-2">
          {filteredLinks.map((link) => (
            <Link key={link.href} to={link.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2",
                  pathname === link.href && "bg-accent text-accent-foreground"
                )}
              >
                <link.icon className="h-5 w-5" />
                {link.title}
              </Button>
            </Link>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 mt-auto">
        <Link to="/help">
          <Button variant="outline" className="w-full justify-start gap-2">
            <HelpCircle className="h-5 w-5" />
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
    <div className="fixed left-0 top-16 z-20 hidden h-[calc(100vh-4rem)] w-64 border-r bg-background md:block">
      <SidebarContent />
    </div>
  );
}

// Mantemos o export default para compatibilidade
export default function SidebarDefault() {
  return <Sidebar />;
}
