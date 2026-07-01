CREATE OR REPLACE FUNCTION public.request_creator_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'creator')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.creator_profiles (user_id, is_approved)
  VALUES (v_user_id, false)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.request_creator_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_creator_account() TO authenticated;