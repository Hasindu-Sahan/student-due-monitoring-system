ALTER TABLE "payment_slips"
ADD COLUMN IF NOT EXISTS "file_data" BYTEA;