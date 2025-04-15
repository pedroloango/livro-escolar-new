
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StudentForm from '@/components/students/StudentForm';
import { Student } from '@/types';
import { getStudentById, updateStudent } from '@/services/studentService';
import { toast } from 'sonner';

export default function EditStudent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        if (!id) return;
        const data = await getStudentById(id);
        if (data) {
          setStudent(data);
        } else {
          toast.error('Aluno não encontrado');
          navigate('/students');
        }
      } catch (error) {
        console.error('Failed to fetch student:', error);
        toast.error('Erro ao carregar dados do aluno');
        navigate('/students');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudent();
  }, [id, navigate]);

  const handleSubmit = async (data: Student) => {
    try {
      setIsSubmitting(true);
      if (!id) return;
      await updateStudent(id, data);
      toast.success('Aluno atualizado com sucesso!');
      navigate('/students');
    } catch (error) {
      console.error('Failed to update student:', error);
      toast.error('Erro ao atualizar aluno');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Editar Aluno</h1>
        <p className="text-muted-foreground">
          Atualize os dados do aluno conforme necessário.
        </p>

        {student && (
          <StudentForm
            initialData={student}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/students')}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
