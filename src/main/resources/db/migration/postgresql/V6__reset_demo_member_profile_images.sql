UPDATE user_profiles
SET profile_image = NULL
WHERE profile_image IS NOT NULL
  AND user_id IN (
      SELECT user_id FROM users
      WHERE email IN ('kim.taehyung@devpath.com', 'park.juseung@devpath.com')
  );
