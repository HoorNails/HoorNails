CREATE POLICY "Admins can read nail photos" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'nail-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload nail photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'nail-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update nail photos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'nail-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete nail photos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'nail-photos' AND public.has_role(auth.uid(), 'admin'));