ALTER TABLE public.groups ADD COLUMN modo_gestao TEXT DEFAULT 'p2p' NOT NULL;
ALTER TABLE public.groups ADD CONSTRAINT groups_modo_gestao_check CHECK (modo_gestao IN ('centralizado', 'p2p'));