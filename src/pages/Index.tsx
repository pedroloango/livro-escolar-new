import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { ADMIN_CREDENTIALS } from '@/hooks/auth/constants';
import { toast } from 'sonner';

const Index = () => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleAccess = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // Login automático como administrador
      await login(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
      console.log('Login realizado com sucesso');
    } catch (error) {
      console.error('Erro ao acessar o sistema:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary/5 p-4">
      <div className="text-center max-w-3xl mx-auto fade-in-animation">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 bg-primary text-white rounded-full flex items-center justify-center">
            <BookOpen className="h-10 w-10" />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-4 text-primary">Biblioteca Escolar</h1>
        <h2 className="text-2xl font-medium mb-6">Sistema de Controle de Empréstimos de Livros</h2>
        <p className="text-lg text-gray-600 mb-8">
          Uma solução completa para gerenciar o acervo de livros, alunos e empréstimos da biblioteca escolar.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button 
            size="lg" 
            onClick={handleAccess}
            disabled={isLoading}
          >
            {isLoading ? 'Acessando...' : 'Acessar o Sistema'}
          </Button>
        </div>
      </div>
      <div className="mt-16 text-center text-gray-500 text-sm">
        Sistema desenvolvido para escolas públicas
      </div>
    </div>
  );
};

export default Index;
