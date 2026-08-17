import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropShiftRequirementCount1700000000002 implements MigrationInterface {
  name = 'DropShiftRequirementCount1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "shift_requirements" DROP COLUMN "requiredCount"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "shift_requirements" ADD COLUMN "requiredCount" integer NOT NULL DEFAULT 1`);
  }
}
