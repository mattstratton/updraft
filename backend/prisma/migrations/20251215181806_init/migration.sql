-- CreateTable
CREATE TABLE "recaps" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recaps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recaps_handle_idx" ON "recaps"("handle");

-- CreateIndex
CREATE INDEX "recaps_expiresAt_idx" ON "recaps"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "recaps_handle_year_key" ON "recaps"("handle", "year");
