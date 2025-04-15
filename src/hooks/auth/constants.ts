
// Lista de usuários permitidos (como fallback)
export const ALLOWED_USERS = [
  { id: '1', email: 'pedro@hotmail.com', password: '123456' },
  { id: '2', email: 'mariaz@hotmail.com', password: '123456' },
  { id: '3', email: 'pedro.loango@hotmail.com', password: '475363', isAdmin: true },
  { id: '4', email: 'ozanete.oliveira@hotmail.com', password: '123456' },
  { id: '5', email: 'patykdcabral@hotmail.com', password: '123456' }
];

// Escola padrão para associar usuários durante o login se necessário
export const DEFAULT_SCHOOL = {
  id: 'default-school-id',
  nome: 'Escola Padrão',
  endereco: 'Endereço da Escola Padrão',
  telefone: '(00) 0000-0000'
};

// Credenciais do administrador (garantir acesso fácil)
export const ADMIN_CREDENTIALS = {
  email: 'pedro.loango@hotmail.com',
  password: '475363'
};
