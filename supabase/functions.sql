
-- Function to get a school by ID
CREATE OR REPLACE FUNCTION public.get_school_by_id(school_id UUID)
RETURNS SETOF public.escolas
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.escolas WHERE id = school_id;
$$;

-- Function to get all schools 
CREATE OR REPLACE FUNCTION public.get_all_schools()
RETURNS SETOF public.escolas
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.escolas ORDER BY nome;
$$;

-- Function to get schools by IDs
CREATE OR REPLACE FUNCTION public.get_schools_by_ids(school_ids UUID[])
RETURNS SETOF public.escolas
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.escolas WHERE id = ANY(school_ids);
$$;

-- Function to create a school
CREATE OR REPLACE FUNCTION public.create_school(
  school_nome TEXT,
  school_endereco TEXT,
  school_telefone TEXT
)
RETURNS SETOF public.escolas
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO public.escolas (nome, endereco, telefone)
  VALUES (school_nome, school_endereco, school_telefone)
  RETURNING *;
$$;

-- Function to update a school
CREATE OR REPLACE FUNCTION public.update_school(
  school_id UUID,
  school_nome TEXT,
  school_endereco TEXT,
  school_telefone TEXT
)
RETURNS SETOF public.escolas
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.escolas
  SET 
    nome = COALESCE(school_nome, nome),
    endereco = COALESCE(school_endereco, endereco),
    telefone = COALESCE(school_telefone, telefone)
  WHERE id = school_id
  RETURNING *;
END;
$$;

-- Function to add stock fields to livros table
CREATE OR REPLACE FUNCTION public.add_stock_fields_to_books()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Add quantidade_total column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'livros' AND column_name = 'quantidade_total'
  ) THEN
    ALTER TABLE public.livros ADD COLUMN quantidade_total INTEGER DEFAULT 1;
  END IF;

  -- Add quantidade_disponivel column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'livros' AND column_name = 'quantidade_disponivel'
  ) THEN
    ALTER TABLE public.livros ADD COLUMN quantidade_disponivel INTEGER DEFAULT 1;
  END IF;

  -- Add quantidade_emprestada column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'livros' AND column_name = 'quantidade_emprestada'
  ) THEN
    ALTER TABLE public.livros ADD COLUMN quantidade_emprestada INTEGER DEFAULT 0;
  END IF;

  -- Update existing books with default values
  UPDATE public.livros 
  SET 
    quantidade_total = COALESCE(quantidade_total, 1),
    quantidade_disponivel = COALESCE(quantidade_disponivel, 1),
    quantidade_emprestada = COALESCE(quantidade_emprestada, 0)
  WHERE quantidade_total IS NULL OR quantidade_disponivel IS NULL OR quantidade_emprestada IS NULL;

  RETURN 'Campos de quantidade adicionados com sucesso à tabela livros';
END;
$$;