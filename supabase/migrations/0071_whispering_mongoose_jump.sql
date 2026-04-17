CREATE OR REPLACE FUNCTION public.set_payment_competence_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _effective_date date;
BEGIN
  -- PRIORIDADE 1: Se o usuário enviou uma competence_key explicitamente (ex: em uma edição manual), 
  -- vamos respeitar essa chave e extrair ano/mês dela.
  IF NEW.competence_key IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.competence_key IS DISTINCT FROM OLD.competence_key) THEN
    BEGIN
      NEW.competence_year := split_part(NEW.competence_key, '-', 1)::int;
      NEW.competence_month := split_part(NEW.competence_key, '-', 2)::int;
      
      -- Sincroniza a competence_date para o dia 1 do mês da chave para não quebrar lógicas de data
      NEW.competence_date := make_date(NEW.competence_year, NEW.competence_month, 1);
      
      RETURN NEW;
    EXCEPTION WHEN OTHERS THEN
      -- Se falhar o parse da key, segue para lógica padrão
    END;
  END IF;

  -- PRIORIDADE 2: Lógica automática baseada em datas
  _effective_date := COALESCE(
    NEW.competence_date,
    (NEW.created_at AT TIME ZONE 'UTC')::date,
    (now() AT TIME ZONE 'UTC')::date
  );

  NEW.competence_year := EXTRACT(YEAR FROM _effective_date)::int;
  NEW.competence_month := EXTRACT(MONTH FROM _effective_date)::int;
  NEW.competence_key := to_char(_effective_date, 'YYYY-MM');

  RETURN NEW;
END;
$function$;
