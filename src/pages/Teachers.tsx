import React from 'react';
import TeacherManager from '@/components/teachers/TeacherManager';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TeachersPage() {
  const navigate = useNavigate();
  return (
    <DashboardLayout>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" onClick={() => navigate(-1)} size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <h1 className="text-2xl font-bold">Cadastro de Professores</h1>
      </div>
      <TeacherManager />
    </DashboardLayout>
  );
} 