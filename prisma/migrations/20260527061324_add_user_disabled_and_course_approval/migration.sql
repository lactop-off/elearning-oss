-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "disabledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Course_approvedAt_idx" ON "Course"("approvedAt");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
