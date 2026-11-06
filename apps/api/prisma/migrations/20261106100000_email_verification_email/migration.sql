-- The address a verification link/code was mailed to. Verifying only counts while it is still the
-- user's email, so "change email" cannot be raced against a code for the old address.
-- Existing rows keep working (email stays NULL).
ALTER TABLE "EmailVerification" ADD COLUMN "email" TEXT;
