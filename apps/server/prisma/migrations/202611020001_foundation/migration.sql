-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "guest" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "class" TEXT NOT NULL DEFAULT 'Citizen',
    "appearance" TEXT NOT NULL DEFAULT 'male',
    "outfit" TEXT NOT NULL DEFAULT 'sage',
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterStats" (
    "characterId" TEXT NOT NULL,
    "strength" INTEGER NOT NULL DEFAULT 5,
    "dexterity" INTEGER NOT NULL DEFAULT 5,
    "intelligence" INTEGER NOT NULL DEFAULT 5,
    "defense" INTEGER NOT NULL DEFAULT 0,
    "criticalChance" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "attackSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "CharacterStats_pkey" PRIMARY KEY ("characterId")
);

-- CreateTable
CREATE TABLE "CharacterSkill" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CharacterSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" JSONB NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "definition" JSONB NOT NULL,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestProgress" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "claimed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuestProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflineActivity" (
    "characterId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfflineActivity_pkey" PRIMARY KEY ("characterId")
);

-- CreateTable
CREATE TABLE "OfflineReward" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "gold" INTEGER NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfflineReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cosmetic" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "definition" JSONB NOT NULL,

    CONSTRAINT "Cosmetic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterCosmetic" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "cosmeticId" TEXT NOT NULL,
    "equipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CharacterCosmetic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSkill_characterId_name_key" ON "CharacterSkill"("characterId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_characterId_itemId_key" ON "Inventory"("characterId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_characterId_slot_key" ON "Equipment"("characterId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "QuestProgress_characterId_questId_key" ON "QuestProgress"("characterId", "questId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterCosmetic_characterId_cosmeticId_key" ON "CharacterCosmetic"("characterId", "cosmeticId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterStats" ADD CONSTRAINT "CharacterStats_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSkill" ADD CONSTRAINT "CharacterSkill_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestProgress" ADD CONSTRAINT "QuestProgress_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestProgress" ADD CONSTRAINT "QuestProgress_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineActivity" ADD CONSTRAINT "OfflineActivity_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineReward" ADD CONSTRAINT "OfflineReward_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterCosmetic" ADD CONSTRAINT "CharacterCosmetic_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterCosmetic" ADD CONSTRAINT "CharacterCosmetic_cosmeticId_fkey" FOREIGN KEY ("cosmeticId") REFERENCES "Cosmetic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
