CREATE TABLE "OAuthClient" (
  "id"           TEXT NOT NULL,
  "clientName"   TEXT NOT NULL,
  "redirectUris" JSONB NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);
