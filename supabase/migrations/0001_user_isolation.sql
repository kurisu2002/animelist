-- 0001: 用户数据隔离（user_id + RLS）
-- 在 Supabase 控制台 SQL Editor 中执行本文件。
-- 注意：先执行，再部署新版前端代码。

-- 1) 添加 user_id 列（幂等）
ALTER TABLE animes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2) 回填已有数据（可选）：把现有记录归属到你的账号
--    查询你的用户 UUID：select id, email from auth.users;
-- UPDATE animes SET user_id = '<你的用户UUID>' WHERE user_id IS NULL;

-- 3) 启用行级安全
ALTER TABLE animes ENABLE ROW LEVEL SECURITY;

-- 4) 策略：每个用户只能读写自己的数据
DROP POLICY IF EXISTS "animes_select_own" ON animes;
CREATE POLICY "animes_select_own" ON animes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "animes_insert_own" ON animes;
CREATE POLICY "animes_insert_own" ON animes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "animes_update_own" ON animes;
CREATE POLICY "animes_update_own" ON animes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "animes_delete_own" ON animes;
CREATE POLICY "animes_delete_own" ON animes
  FOR DELETE USING (auth.uid() = user_id);

-- 5) avatars 存储桶策略：头像按 user_id/ 路径隔离
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);