-- Garante que a política antiga restritiva seja removida
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Cria (ou recria) a política permitindo leitura pública para usuários autenticados
-- Isso é essencial para que o nome e foto apareçam nos cards de membros
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);