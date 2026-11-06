-- 6-digit email verification code, mailed next to the existing link.
-- Both live on the same EmailVerification row. Existing rows keep working (codeHash stays NULL).
ALTER TABLE "EmailVerification" ADD COLUMN "codeHash" TEXT,
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- "Send me tips & product updates" checkbox on the sign-up form.
ALTER TABLE "User" ADD COLUMN "marketingOptIn" BOOLEAN NOT NULL DEFAULT false;
