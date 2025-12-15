-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'employee',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nom" TEXT,
    "prenom" TEXT,
    "telephone" TEXT,
    "categorie" TEXT,
    "dateEmbauche" TIMESTAMP(3),
    "codeActivation" TEXT,
    "firstLoginDone" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'actif',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PasswordReset" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Pointage" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "horodatage" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Pointage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Conge" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en attente',
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "vu" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Conge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Planning" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "heureDebut" TIMESTAMP(3) NOT NULL,
    "heureFin" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Planning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Shift" (
    "id" SERIAL NOT NULL,
    "employeId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "motif" TEXT,
    "segments" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExtraPaymentLog" (
    "id" SERIAL NOT NULL,
    "shiftId" INTEGER NOT NULL,
    "segmentIndex" INTEGER NOT NULL,
    "employeId" INTEGER NOT NULL,
    "changedByUserId" INTEGER NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtraPaymentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Anomalie" (
    "id" SERIAL NOT NULL,
    "employeId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "gravite" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" JSONB,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "commentaire" TEXT,
    "traitePar" INTEGER,
    "traiteAt" TIMESTAMP(3),
    "montantExtra" DECIMAL(65,30),
    "heuresExtra" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anomalie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "public"."PasswordReset"("token");

-- CreateIndex
CREATE INDEX "ExtraPaymentLog_shiftId_idx" ON "public"."ExtraPaymentLog"("shiftId");

-- CreateIndex
CREATE INDEX "ExtraPaymentLog_employeId_idx" ON "public"."ExtraPaymentLog"("employeId");

-- CreateIndex
CREATE INDEX "ExtraPaymentLog_createdAt_idx" ON "public"."ExtraPaymentLog"("createdAt");

-- CreateIndex
CREATE INDEX "Anomalie_employeId_idx" ON "public"."Anomalie"("employeId");

-- CreateIndex
CREATE INDEX "Anomalie_date_idx" ON "public"."Anomalie"("date");

-- CreateIndex
CREATE INDEX "Anomalie_statut_idx" ON "public"."Anomalie"("statut");

-- CreateIndex
CREATE INDEX "Anomalie_type_idx" ON "public"."Anomalie"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Anomalie_employeId_date_type_description_key" ON "public"."Anomalie"("employeId", "date", "type", "description");

-- AddForeignKey
ALTER TABLE "public"."PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pointage" ADD CONSTRAINT "Pointage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conge" ADD CONSTRAINT "Conge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Planning" ADD CONSTRAINT "Planning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Shift" ADD CONSTRAINT "Shift_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExtraPaymentLog" ADD CONSTRAINT "ExtraPaymentLog_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "public"."Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExtraPaymentLog" ADD CONSTRAINT "ExtraPaymentLog_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExtraPaymentLog" ADD CONSTRAINT "ExtraPaymentLog_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Anomalie" ADD CONSTRAINT "Anomalie_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Anomalie" ADD CONSTRAINT "Anomalie_traitePar_fkey" FOREIGN KEY ("traitePar") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
