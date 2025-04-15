import { useNavigate } from 'react-router-dom';
import { useAuthState } from './auth/useAuthState';
import { useLogout } from './auth/useLogout';

export function useAuthProvider() {
  const navigate = useNavigate();
  const authState = useAuthState();
  const { isAdmin, currentSchool } = authState;
  
  // Set up logout handler
  const { logout } = useLogout(authState);

  return {
    user: {
      id: '1',
      email: 'admin@example.com',
      is_confirmed: true
    },
    loading: false,
    login: async () => {},
    logout,
    isAuthenticated: true,
    isAdmin: true,
    currentSchool,
  };
}
