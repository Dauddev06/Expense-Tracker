import { MigrationInterface, QueryRunner } from "typeorm";

export class RepeatingIncome1791645458256 implements MigrationInterface {
    name = 'RepeatingIncome1791645458256'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "incomes" ADD "repeats" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "incomes" ADD "copiedFromId" uuid`);
        await queryRunner.query(`ALTER TABLE "incomes" ADD CONSTRAINT "UQ_cc6861c09149a2d4ebbcba373b8" UNIQUE ("copiedFromId")`);
        await queryRunner.query(`ALTER TABLE "incomes" ADD CONSTRAINT "FK_cc6861c09149a2d4ebbcba373b8" FOREIGN KEY ("copiedFromId") REFERENCES "incomes"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "incomes" DROP CONSTRAINT "FK_cc6861c09149a2d4ebbcba373b8"`);
        await queryRunner.query(`ALTER TABLE "incomes" DROP CONSTRAINT "UQ_cc6861c09149a2d4ebbcba373b8"`);
        await queryRunner.query(`ALTER TABLE "incomes" DROP COLUMN "copiedFromId"`);
        await queryRunner.query(`ALTER TABLE "incomes" DROP COLUMN "repeats"`);
    }

}
