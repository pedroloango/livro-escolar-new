
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Student } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface StudentFormProps {
  initialData?: Student;
  onSubmit: (data: Student) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function StudentForm({ initialData, onSubmit, onCancel, isSubmitting }: StudentFormProps) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<Student>({
    defaultValues: initialData || {
      nome: '',
      serie: 1,
      turma: 'A',
      turno: 'Matutino',
      sexo: 'Masculino',
      data_nascimento: ''
    }
  });

  // Watch form values to update controlled components
  const watchSexo = watch('sexo');
  const watchTurno = watch('turno');
  const watchTurma = watch('turma');
  const watchSerie = watch('serie');

  // Handle select changes
  const handleSelectChange = (field: keyof Student, value: any) => {
    setValue(field, value);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{initialData ? 'Editar Aluno' : 'Novo Aluno'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo</Label>
            <Input
              id="nome"
              placeholder="Digite o nome completo"
              {...register('nome', { required: 'Nome é obrigatório' })}
              className={errors.nome ? 'border-red-500' : ''}
            />
            {errors.nome && <p className="text-red-500 text-sm">{errors.nome.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serie">Série</Label>
              <Select
                value={watchSerie.toString()}
                onValueChange={(value) => handleSelectChange('serie', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a série" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((serie) => (
                    <SelectItem key={serie} value={serie.toString()}>
                      {serie}º Ano
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="turma">Turma</Label>
              <Select
                value={watchTurma}
                onValueChange={(value) => handleSelectChange('turma', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {['A', 'B', 'C', 'D', 'E'].map((turma) => (
                    <SelectItem key={turma} value={turma}>
                      {turma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="turno">Turno</Label>
            <Select
              value={watchTurno}
              onValueChange={(value) => handleSelectChange('turno', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o turno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Matutino">Matutino</SelectItem>
                <SelectItem value="Vespertino">Vespertino</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sexo</Label>
            <RadioGroup
              value={watchSexo}
              onValueChange={(value) => handleSelectChange('sexo', value)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Masculino" id="masculino" />
                <Label htmlFor="masculino">Masculino</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Feminino" id="feminino" />
                <Label htmlFor="feminino">Feminino</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_nascimento">Data de Nascimento</Label>
            <Input
              id="data_nascimento"
              type="date"
              {...register('data_nascimento', { required: 'Data de nascimento é obrigatória' })}
              className={errors.data_nascimento ? 'border-red-500' : ''}
            />
            {errors.data_nascimento && (
              <p className="text-red-500 text-sm">{errors.data_nascimento.message}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel} type="button">
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
