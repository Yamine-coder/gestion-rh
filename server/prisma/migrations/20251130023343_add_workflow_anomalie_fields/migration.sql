-- AlterTable
ALTER TABLE "public"."Anomalie" ADD COLUMN     "commentaireManager" TEXT,
ADD COLUMN     "fichierJustificatif" TEXT,
ADD COLUMN     "justificationEmploye" TEXT;

-- CreateTable
CREATE TABLE "public"."ShiftCorrection" (
    "id" SERIAL NOT NULL,
    "shiftId" INTEGER NOT NULL,
    "anomalieId" INTEGER,
    "ancienneVersion" JSONB NOT NULL,
    "nouvelleVersion" JSONB NOT NULL,
    "raison" TEXT NOT NULL,
    "typeCorrection" TEXT NOT NULL,
    "preuves" JSONB,
    "auteurId" INTEGER NOT NULL,
    "approuvePar" INTEGER,
    "dateCorrection" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,

    CONSTRAINT "ShiftCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AnomalieAudit" (
    "id" SERIAL NOT NULL,
    "anomalieId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "etatAvant" JSONB,
    "etatApres" JSONB,
    "userId" INTEGER NOT NULL,
    "userRole" TEXT NOT NULL,
    "commentaire" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "AnomalieAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmployeScore" (
    "id" SERIAL NOT NULL,
    "employeId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 100,
    "historiqueModifications" JSONB[],
    "derniereMaj" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftCorrection_shiftId_idx" ON "public"."ShiftCorrection"("shiftId");

-- CreateIndex
CREATE INDEX "ShiftCorrection_anomalieId_idx" ON "public"."ShiftCorrection"("anomalieId");

-- CreateIndex
CREATE INDEX "ShiftCorrection_dateCorrection_idx" ON "public"."ShiftCorrection"("dateCorrection");

-- CreateIndex
CREATE INDEX "AnomalieAudit_anomalieId_idx" ON "public"."AnomalieAudit"("anomalieId");

-- CreateIndex
CREATE INDEX "AnomalieAudit_userId_idx" ON "public"."AnomalieAudit"("userId");

-- CreateIndex
CREATE INDEX "AnomalieAudit_timestamp_idx" ON "public"."AnomalieAudit"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeScore_employeId_key" ON "public"."EmployeScore"("employeId");

-- CreateIndex
CREATE INDEX "EmployeScore_employeId_idx" ON "public"."EmployeScore"("employeId");

-- CreateIndex
CREATE INDEX "EmployeScore_score_idx" ON "public"."EmployeScore"("score");

-- AddForeignKey
ALTER TABLE "public"."ShiftCorrection" ADD CONSTRAINT "ShiftCorrection_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "public"."Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShiftCorrection" ADD CONSTRAINT "ShiftCorrection_anomalieId_fkey" FOREIGN KEY ("anomalieId") REFERENCES "public"."Anomalie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AnomalieAudit" ADD CONSTRAINT "AnomalieAudit_anomalieId_fkey" FOREIGN KEY ("anomalieId") REFERENCES "public"."Anomalie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
