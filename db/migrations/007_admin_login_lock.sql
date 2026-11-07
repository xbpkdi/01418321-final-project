-- Feature 002 / login lock fix
-- UC 1A: after the 5th failed password the account is locked for a fixed
-- time and then unlocks by itself. fail_attempts alone cannot tell when the
-- lock started, so the end of the lock is stored here (NULL = not locked).
ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Accounts that were already at the limit get a fresh lock window instead of
-- staying locked for good.
UPDATE admins
SET locked_until = CURRENT_TIMESTAMP + INTERVAL '15 minutes'
WHERE fail_attempts >= 5 AND locked_until IS NULL;
