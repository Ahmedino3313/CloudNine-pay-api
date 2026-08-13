-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailOtp" TEXT,
ADD COLUMN     "emailOtpExpiry" TIMESTAMP(3),
ADD COLUMN     "phoneOtp" TEXT,
ADD COLUMN     "phoneOtpExpiry" TIMESTAMP(3);
