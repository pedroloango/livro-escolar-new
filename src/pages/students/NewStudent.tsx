
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StudentForm from '@/components/students/StudentForm';
import { Student } from '@/types';
import { createStudent } from '@/services/studentService';
import { toast } from 'sonner';

export default function NewStudent() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: Student) => {
    try {
      setIsSubmitting(true);
      await createStudent(data);
      toast.success('Aluno cadastrado com sucesso!');
      navigate('/students');
    } catch (error) {
      console.error('Failed to create student:', error);
      toast.error('Erro ao cadastrar aluno');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Cadastrar Novo Aluno</h1>
        <p className="text-muted-foreground">
          Preencha os dados do aluno para cadastrá-lo no sistema.
        </p>

        <StudentForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/students')}
          isSubmitting={isSubmitting}
        />
      </div>
    </DashboardLayout>
  );
}
