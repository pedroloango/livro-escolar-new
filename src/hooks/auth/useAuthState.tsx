
import { useState } from 'react';
import { User, School } from '@/types';

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  return {
    user,
    setUser,
    isAdmin,
    setIsAdmin,
    currentSchool,
    setCurrentSchool,
    loading,
    setLoading,
  };
}
