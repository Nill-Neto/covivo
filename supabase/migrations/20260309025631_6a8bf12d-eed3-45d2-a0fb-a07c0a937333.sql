
-- Add nickname column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname text;

-- Add document_url columns to profile_sensitive for RG uploads
ALTER TABLE public.profile_sensitive ADD COLUMN IF NOT EXISTS rg_front_url text;
ALTER TABLE public.profile_sensitive ADD COLUMN IF NOT EXISTS rg_back_url text;
ALTER TABLE public.profile_sensitive ADD COLUMN IF NOT EXISTS rg_digital_url text;

-- Create documents bucket for RG uploads (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload their own documents
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage RLS: users can view their own documents
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage RLS: users can update their own documents
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage RLS: users can delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage RLS: admins can view group member documents
CREATE POLICY "Admins can view member documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_admin_of_user(auth.uid(), (storage.foldername(name))[1]::uuid)
);
