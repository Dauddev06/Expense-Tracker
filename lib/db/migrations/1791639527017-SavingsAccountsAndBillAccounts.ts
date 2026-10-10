import { MigrationInterface, QueryRunner } from "typeorm";

export class SavingsAccountsAndBillAccounts1791639527017 implements MigrationInterface {
    name = 'SavingsAccountsAndBillAccounts1791639527017'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "savings_accounts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "key" character varying(20) NOT NULL, "name" character varying(60) NOT NULL, "closed" boolean NOT NULL DEFAULT false, "userId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_75c3ac9a54f19179f999beb9cc7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fa342435c235df7616c78e146f" ON "savings_accounts"  ("userId", "key") `);
        await queryRunner.query(`ALTER TABLE "recurring_expenses" ADD "account" character varying(20) NOT NULL DEFAULT 'current'`);
        await queryRunner.query(`ALTER TABLE "planned_expenses" ADD "account" character varying(20) NOT NULL DEFAULT 'current'`);
        await queryRunner.query(`ALTER TABLE "savings_accounts" ADD CONSTRAINT "FK_1c7045be207246d99e6ce069a8a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "savings_accounts" DROP CONSTRAINT "FK_1c7045be207246d99e6ce069a8a"`);
        await queryRunner.query(`ALTER TABLE "planned_expenses" DROP COLUMN "account"`);
        await queryRunner.query(`ALTER TABLE "recurring_expenses" DROP COLUMN "account"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fa342435c235df7616c78e146f"`);
        await queryRunner.query(`DROP TABLE "savings_accounts"`);
    }

}
