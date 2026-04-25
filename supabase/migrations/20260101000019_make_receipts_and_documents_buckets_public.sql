DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    UPDATE storage.buckets
    SET public = true
    WHERE id IN ('receipts', 'documents');
  ELSE
    RAISE NOTICE 'Skipping bucket visibility update: storage.buckets does not exist yet.';
  END IF;
END;
$$;
