# Sistema de Controle de Estoque de Livros

## Visão Geral

O sistema de controle de estoque permite gerenciar a quantidade de exemplares de cada livro na biblioteca, controlando automaticamente a disponibilidade para empréstimos e devoluções.

## Funcionalidades Implementadas

### 1. Campos de Quantidade nos Livros

Cada livro agora possui três campos de quantidade:

- **Quantidade Total**: Número total de exemplares do livro
- **Quantidade Disponível**: Número de exemplares disponíveis para empréstimo
- **Quantidade Emprestada**: Número de exemplares atualmente emprestados

### 2. Interface da Tela de Livros

#### Cards de Resumo do Estoque
- **Total de Livros**: Número de títulos únicos cadastrados
- **Estoque Total**: Soma de todos os exemplares
- **Disponível**: Total de exemplares disponíveis para empréstimo
- **Emprestado**: Total de exemplares em circulação
- **Estoque Baixo**: Livros com ≤ 5 exemplares disponíveis

#### Tabela de Livros Atualizada
- Coluna **Total**: Mostra a quantidade total de exemplares
- Coluna **Disponível**: Mostra exemplares disponíveis com badge colorido
  - Verde: Estoque normal (> 5 exemplares)
  - Vermelho: Estoque baixo (≤ 5 exemplares)
- Coluna **Emprestado**: Mostra exemplares emprestados

### 3. Controle Automático de Estoque

#### Empréstimos
- Ao criar um empréstimo, o sistema automaticamente:
  - Reduz a quantidade disponível
  - Aumenta a quantidade emprestada
  - Valida se há exemplares suficientes disponíveis

#### Devoluções
- Ao registrar uma devolução, o sistema automaticamente:
  - Aumenta a quantidade disponível
  - Reduz a quantidade emprestada
  - Atualiza o status do empréstimo

#### Exclusão de Empréstimos
- Ao excluir um empréstimo ativo, o sistema:
  - Reverte automaticamente o estoque
  - Restaura a quantidade disponível

### 4. Validações de Estoque

#### Validações Automáticas
- **Empréstimo**: Verifica se há quantidade suficiente disponível
- **Devolução**: Verifica se não está devolvendo mais do que foi emprestado
- **Exclusão**: Reverte o estoque apenas para empréstimos ativos

#### Mensagens de Erro
- "Quantidade insuficiente. Disponível: X, Solicitado: Y"
- "Quantidade inválida para devolução. Emprestado: X, Devolvido: Y"

## Como Usar

### 1. Cadastrar Novo Livro

1. Acesse **Livros** → **Novo Livro**
2. Preencha:
   - Título do livro
   - Código de barras
   - **Quantidade Total**: Número total de exemplares
   - **Quantidade Disponível**: Geralmente igual à quantidade total
   - **Quantidade Emprestada**: Geralmente 0 para livros novos

### 2. Visualizar Estoque

1. Acesse a tela **Livros**
2. Visualize os cards de resumo no topo
3. Consulte a tabela para ver detalhes de cada livro
4. Livros com estoque baixo aparecem com badge vermelho

### 3. Gerenciar Empréstimos

1. Ao fazer um empréstimo, o sistema automaticamente:
   - Verifica disponibilidade
   - Atualiza o estoque
   - Registra o empréstimo

2. Ao registrar devolução, o sistema automaticamente:
   - Atualiza o estoque
   - Marca como devolvido ou pendente

### 4. Monitorar Estoque Baixo

- Livros com ≤ 5 exemplares disponíveis são destacados em vermelho
- O card "Estoque Baixo" mostra quantos livros precisam de reposição
- Use esta informação para planejar compras de novos exemplares

## Estrutura Técnica

### Campos Adicionados ao Modelo Book

```typescript
interface Book {
  id?: string;
  titulo: string;
  codigo_barras: string;
  autor?: string;
  editora?: string;
  escola_id?: string;
  quantidade_total: number;        // NOVO
  quantidade_disponivel: number;  // NOVO
  quantidade_emprestada: number;  // NOVO
}
```

### Funções de Controle de Estoque

#### `updateBookStock(bookId, operation, quantity)`
- **operation**: 'emprestar' | 'devolver'
- **quantity**: número de exemplares
- Atualiza automaticamente as quantidades disponível e emprestada

#### `getStockSummary()`
- Retorna resumo completo do estoque da escola
- Inclui totais e contagem de livros com estoque baixo

#### `getBooksWithLowStock(threshold)`
- Retorna livros com estoque abaixo do limite especificado
- Padrão: ≤ 5 exemplares

### Integração com Empréstimos

- **createLoan()**: Atualiza estoque ao criar empréstimo
- **returnLoan()**: Atualiza estoque ao registrar devolução
- **deleteLoan()**: Reverte estoque ao excluir empréstimo ativo

## Benefícios

### 1. Controle Preciso
- Rastreamento exato de cada exemplar
- Prevenção de empréstimos sem estoque
- Histórico completo de movimentações

### 2. Visibilidade
- Dashboard com resumo do estoque
- Alertas visuais para estoque baixo
- Relatórios de disponibilidade

### 3. Automação
- Atualização automática do estoque
- Validações automáticas
- Prevenção de erros humanos

### 4. Gestão Eficiente
- Identificação rápida de livros para reposição
- Planejamento de compras baseado em dados
- Otimização do acervo

## Próximos Passos Recomendados

1. **Migração de Dados Existentes**
   - Atualizar livros existentes com quantidades padrão
   - Sincronizar com empréstimos ativos

2. **Relatórios Avançados**
   - Relatório de livros mais emprestados
   - Análise de rotatividade do estoque
   - Previsão de necessidades de reposição

3. **Alertas Automáticos**
   - Notificações quando estoque fica baixo
   - Lembretes de livros em atraso
   - Relatórios periódicos de estoque

4. **Integração com Compras**
   - Lista de livros para reposição
   - Orçamento baseado em necessidades
   - Controle de fornecedores

## Considerações Importantes

### Banco de Dados
- Os novos campos precisam ser adicionados à tabela `livros`
- Valores padrão recomendados para livros existentes:
  - `quantidade_total`: 1
  - `quantidade_disponivel`: 1
  - `quantidade_emprestada`: 0

### Migração
- Livros existentes precisam ser atualizados com quantidades
- Empréstimos ativos devem ser considerados na migração
- Backup recomendado antes da migração

### Performance
- Índices recomendados nos campos de quantidade
- Cache para consultas frequentes de estoque
- Otimização de consultas de resumo

Este sistema de controle de estoque proporciona uma gestão completa e automatizada do acervo da biblioteca, garantindo precisão e eficiência nas operações de empréstimo e devolução.
