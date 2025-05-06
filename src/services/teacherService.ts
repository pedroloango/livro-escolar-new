import { supabase } from '@/integrations/supabase/client';

export type Teacher = {
  id: string;
  nome: string;
  created_at?: string;
};

export async function getTeachers(): Promise<Teacher[]> {
  const { data, error } = await supabase
    .from('professores')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Teacher[];
}

export async function addTeacher(teacher: Omit<Teacher, 'id' | 'created_at'>): Promise<Teacher> {
  const { data, error } = await supabase
    .from('professores')
    .insert([teacher])
    .select()
    .single();
  if (error) throw error;
  return data as Teacher;
}

export async function updateTeacher(id: string, updates: Partial<Omit<Teacher, 'id' | 'created_at'>>): Promise<Teacher> {
  const { data, error } = await supabase
    .from('professores')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Teacher;
}

export async function deleteTeacher(id: string): Promise<void> {
  const { error } = await supabase
    .from('professores')
    .delete()
    .eq('id', id);
  if (error) throw error;
} 