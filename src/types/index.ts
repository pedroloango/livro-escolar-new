export interface Student {
  id?: string;
  nome: string;
  serie: number;
  turma: string;
  turno: string;
  sexo: string;
  data_nascimento: string;
  escola_id?: string;
}

export interface Book {
  id?: string;
  titulo: string;
  codigo_barras: string;
  escola_id?: string;
}

export interface Loan {
  id?: string;
  aluno_id?: string;
  professor_id?: string;
  livro_id: string;
  data_retirada: string;
  quantidade_retirada: number;
  data_devolucao?: string;
  quantidade_devolvida?: number;
  status: "Emprestado" | "Devolvido" | "Pendente";
  aluno?: Student;
  professor?: import('@/services/teacherService').Teacher;
  livro?: Book;
  escola_id?: string;
}

export interface User {
  id: string;
  email: string;
  is_confirmed?: boolean;
}

export interface School {
  id: string;
  nome: string;
  endereco?: string;
  telefone?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  nome: string | null;
  email: string | null;
  role: string;
  status: string;
  created_at: string;
  escola_id?: string | null;
  escola?: School | null;
}

export interface UserWithProfile extends User {
  profile?: Profile;
}

// Create a type for raw data from Supabase tables
export interface SchoolRecord {
  id: string;
  nome: string;
  endereco?: string;
  telefone?: string;
  created_at: string;
}

export interface ProfileRecord {
  id: string;
  nome: string | null;
  email: string | null;
  role: string;
  status: string;
  created_at: string;
  escola_id?: string | null;
}
