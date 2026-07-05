-- Make scheduledFor nullable to support draft posts (status = 'draft')
ALTER TABLE "PostJob" ALTER COLUMN "scheduledFor" DROP NOT NULL;
