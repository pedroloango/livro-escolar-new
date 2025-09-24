-- Script para adicionar campos de quantidade à tabela livros
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar coluna quantidade_total se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'livros' AND column_name = 'quantidade_total'
    ) THEN
        ALTER TABLE public.livros ADD COLUMN quantidade_total INTEGER DEFAULT 1;
        RAISE NOTICE 'Coluna quantidade_total adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna quantidade_total já existe';
    END IF;
END $$;

-- 2. Adicionar coluna quantidade_disponivel se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'livros' AND column_name = 'quantidade_disponivel'
    ) THEN
        ALTER TABLE public.livros ADD COLUMN quantidade_disponivel INTEGER DEFAULT 1;
        RAISE NOTICE 'Coluna quantidade_disponivel adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna quantidade_disponivel já existe';
    END IF;
END $$;

-- 3. Adicionar coluna quantidade_emprestada se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'livros' AND column_name = 'quantidade_emprestada'
    ) THEN
        ALTER TABLE public.livros ADD COLUMN quantidade_emprestada INTEGER DEFAULT 0;
        RAISE NOTICE 'Coluna quantidade_emprestada adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna quantidade_emprestada já existe';
    END IF;
END $$;

-- 4. Atualizar livros existentes com valores padrão
UPDATE public.livros 
SET 
    quantidade_total = COALESCE(quantidade_total, 1),
    quantidade_disponivel = COALESCE(quantidade_disponivel, 1),
    quantidade_emprestada = COALESCE(quantidade_emprestada, 0)
WHERE 
    quantidade_total IS NULL 
    OR quantidade_disponivel IS NULL 
    OR quantidade_emprestada IS NULL;

-- 5. Verificar quantos livros foram atualizados
SELECT 
    COUNT(*) as total_livros,
    COUNT(CASE WHEN quantidade_total IS NOT NULL THEN 1 END) as com_quantidade_total,
    COUNT(CASE WHEN quantidade_disponivel IS NOT NULL THEN 1 END) as com_quantidade_disponivel,
    COUNT(CASE WHEN quantidade_emprestada IS NOT NULL THEN 1 END) as com_quantidade_emprestada
FROM public.livros;

-- 6. Mostrar alguns exemplos de livros atualizados
SELECT 
    id,
    titulo,
    quantidade_total,
    quantidade_disponivel,
    quantidade_emprestada
FROM public.livros 
LIMIT 5;

-- Mensagem final
DO $$
BEGIN
    RAISE NOTICE 'Migração concluída com sucesso!';
    RAISE NOTICE 'Campos de quantidade adicionados à tabela livros';
    RAISE NOTICE 'Todos os livros existentes foram atualizados com valores padrão';
END $$;
