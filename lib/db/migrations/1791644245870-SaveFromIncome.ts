import { MigrationInterface, QueryRunner } from "typeorm";

export class SaveFromIncome1791644245870 implements MigrationInterface {
    name = 'SaveFromIncome1791644245870'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "incomes" ADD "savingsPercentApplied" numeric(5,2)`);
        await queryRunner.query(`ALTER TABLE "incomes" ADD "savingsAccountApplied" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "user_settings" ADD "savingsPercent" numeric(5,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "user_settings" ADD "savingsAccount" character varying(20) NOT NULL DEFAULT 'savings'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_settings" DROP COLUMN "savingsAccount"`);
        await queryRunner.query(`ALTER TABLE "user_settings" DROP COLUMN "savingsPercent"`);
        await queryRunner.query(`ALTER TABLE "incomes" DROP COLUMN "savingsAccountApplied"`);
        await queryRunner.query(`ALTER TABLE "incomes" DROP COLUMN "savingsPercentApplied"`);
    }

}
