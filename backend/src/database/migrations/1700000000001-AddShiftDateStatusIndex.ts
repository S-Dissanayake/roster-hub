import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShiftDateStatusIndex1700000000001 implements MigrationInterface {
  name = 'AddShiftDateStatusIndex1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_shifts_date_status" ON "shifts" ("date", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_shifts_date_status"`);
  }
}
