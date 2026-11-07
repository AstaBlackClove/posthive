-- AlterTable: no longer needed — unverified signups never reach EmailVerification/User now
ALTER TABLE "EmailVerification" DROP COLUMN IF EXISTS "codeHash";
ALTER TABLE "EmailVerification" DROP COLUMN IF EXISTS "attempts";

-- CreateTable
CREATE TABLE "PendingSignup" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingSignup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PendingSignup_email_key" ON "PendingSignup"("email");
CREATE UNIQUE INDEX "PendingSignup_token_key" ON "PendingSignup"("token");
CREATE INDEX "PendingSignup_token_idx" ON "PendingSignup"("token");

-- Enable Row Level Security
ALTER TABLE "PendingSignup" ENABLE ROW LEVEL SECURITY;
