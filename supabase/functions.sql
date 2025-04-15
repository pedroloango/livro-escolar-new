
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
