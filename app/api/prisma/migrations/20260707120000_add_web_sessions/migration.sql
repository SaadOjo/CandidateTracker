CREATE TABLE "web_sessions" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "web_sessions_token_hash_key" ON "web_sessions"("token_hash");
CREATE INDEX "web_sessions_user_id_idx" ON "web_sessions"("user_id");
CREATE INDEX "web_sessions_expires_at_idx" ON "web_sessions"("expires_at");

ALTER TABLE "web_sessions"
ADD CONSTRAINT "web_sessions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
