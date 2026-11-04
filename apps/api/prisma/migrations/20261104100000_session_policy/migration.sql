-- Replace stateless-ish RefreshToken with server-side Session (idle + absolute
-- timeout, hashed rotating refresh token). All existing logins are invalidated.

DROP TABLE "RefreshToken";

CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "prevTokenHash" TEXT,
    "rotatedAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE UNIQUE INDEX "AuthSession_prevTokenHash_key" ON "AuthSession"("prevTokenHash");
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuthSession" ENABLE ROW LEVEL SECURITY;
