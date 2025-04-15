import { User, School } from '@/types';

export type AuthState = {
  user: User | null;
  setUser: (user: User | null) => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  currentSchool: School | null;
  setCurrentSchool: (school: School | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
};

export type AuthContextType = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  currentSchool: School | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
