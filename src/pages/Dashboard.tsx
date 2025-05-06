import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getStudents } from '@/services/studentService';
import { getBooks, getBooksCount } from '@/services/bookService';
import { getLoans, getActiveLoans } from '@/services/loanService';
import { Link } from 'react-router-dom';
import { Book, Users, BookMarked, ArrowDownToLine } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalBooks: 0,
    activeLoans: 0,
    totalLoans: 0,
  });
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [students, booksCount, loans, activeLoans] = await Promise.all([
          getStudents(),
          getBooksCount(),
          getLoans(),
          getActiveLoans(),
        ]);

        setStats({
          totalStudents: students.length,
          totalBooks: booksCount,
          activeLoans: activeLoans.length,
          totalLoans: loans.length,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {isAdmin 
            ? 'Bem-vindo Administrador ao Sistema de Controle de Empréstimos de Livros!'
            : 'Bem-vindo Usuário ao Sistema de Controle de Empréstimos de Livros!'
          }
        </p>

        {loading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <CardTitle className="h-6 bg-muted rounded-md"></CardTitle>
                  <CardDescription className="h-4 bg-muted rounded-md w-2/3 mt-2"></CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded-md w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/students">
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-medium">
                      Total de Alunos
                    </CardTitle>
                    <CardDescription>
                      Alunos cadastrados no sistema
                    </CardDescription>
                  </div>
                  <div className="text-primary bg-primary/10 p-2 rounded-md">
                    <Users className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalStudents}</div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/books">
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-medium">
                      Total de Livros
                    </CardTitle>
                    <CardDescription>
                      Livros cadastrados no sistema
                    </CardDescription>
                  </div>
                  <div className="text-primary bg-primary/10 p-2 rounded-md">
                    <Book className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalBooks}</div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/loans">
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-medium">
                      Empréstimos Ativos
                    </CardTitle>
                    <CardDescription>
                      Empréstimos em andamento
                    </CardDescription>
                  </div>
                  <div className="text-primary bg-primary/10 p-2 rounded-md">
                    <BookMarked className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeLoans}</div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/returns">
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-medium">
                      Total de Empréstimos
                    </CardTitle>
                    <CardDescription>
                      Histórico de empréstimos
                    </CardDescription>
                  </div>
                  <div className="text-primary bg-primary/10 p-2 rounded-md">
                    <ArrowDownToLine className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalLoans}</div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Acesso Rápido</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/students/new">
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Cadastrar Aluno
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Adicione um novo aluno ao sistema
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/books/new">
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Book className="h-4 w-4 mr-2" />
                    Cadastrar Livro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Adicione um novo livro ao acervo
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/loans/new">
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <BookMarked className="h-4 w-4 mr-2" />
                    Registrar Empréstimo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Registre um novo empréstimo
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/returns">
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <ArrowDownToLine className="h-4 w-4 mr-2" />
                    Registrar Devolução
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Registre a devolução de um livro
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
