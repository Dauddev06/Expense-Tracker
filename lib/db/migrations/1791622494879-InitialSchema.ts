import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1791622494879 implements MigrationInterface {
    name = 'InitialSchema1791622494879'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(100) NOT NULL, "email" character varying(255) NOT NULL, "passwordHash" character varying(255) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "token" character varying(255) NOT NULL, "userId" uuid NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_e9f62f5dcb8a54b84234c9e7a06" UNIQUE ("token"), CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "spendings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "title" character varying(120) NOT NULL, "amount" numeric(12,2) NOT NULL, "category" character varying(30) NOT NULL, "spentOn" date NOT NULL, "note" text, "account" character varying(20) NOT NULL DEFAULT 'current', "userId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f8490e90a72ada7e64fce9da863" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ledger_entries" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" character varying(30) NOT NULL, "amount" numeric(12,2) NOT NULL, "fromAccount" character varying(20), "toAccount" character varying(20), "occurredOn" date NOT NULL, "note" text, "userId" uuid NOT NULL, "incomeId" uuid, "loanId" uuid, "loanPaymentId" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6efcb84411d3f08b08450ae75d5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_54ce48aa99842c5ab30057f548" ON "ledger_entries"  ("userId", "occurredOn") `);
        await queryRunner.query(`CREATE TABLE "incomes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "chapter" character varying(7) NOT NULL, "title" character varying(120) NOT NULL, "amount" numeric(12,2) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'expected', "receivedOn" date, "sadqaPercentApplied" numeric(5,2), "userId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d737b3d0314c1f0da5461a55e5e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1e78aad3f8608013496aa8e491" ON "incomes"  ("userId", "chapter") `);
        await queryRunner.query(`CREATE TABLE "user_settings" ("userId" uuid NOT NULL, "sadqaPercent" numeric(5,2) NOT NULL DEFAULT '0', "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_986a2b6d3c05eb4091bb8066f78" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`CREATE TABLE "recurring_expenses" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "title" character varying(120) NOT NULL, "amount" numeric(12,2) NOT NULL, "category" character varying(30) NOT NULL, "frequency" character varying(20) NOT NULL, "active" boolean NOT NULL DEFAULT true, "startChapter" character varying(7) NOT NULL, "userId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_592b47923f3bdb6035439182e66" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c3a0703f52dda84b1df25ce195" ON "recurring_expenses"  ("userId") `);
        await queryRunner.query(`CREATE TABLE "planned_expenses" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "chapter" character varying(7) NOT NULL, "title" character varying(120) NOT NULL, "amount" numeric(12,2) NOT NULL, "category" character varying(30) NOT NULL, "dueDate" date NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "recurringExpenseId" uuid, "spendingId" uuid, "userId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_planned_recurring_due" UNIQUE ("recurringExpenseId", "dueDate"), CONSTRAINT "PK_74ba568c345b1e05d70e6a9f3d0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_07038add3917e2565463f64f84" ON "planned_expenses"  ("userId", "chapter") `);
        await queryRunner.query(`CREATE TABLE "loans" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "personName" character varying(100) NOT NULL, "direction" character varying(10) NOT NULL, "amount" numeric(12,2) NOT NULL, "account" character varying(20) NOT NULL, "startedOn" date NOT NULL, "note" text, "status" character varying(10) NOT NULL DEFAULT 'open', "userId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5c6942c1e13e4de135c5203ee61" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4c2ab4e556520045a2285916d4" ON "loans"  ("userId") `);
        await queryRunner.query(`CREATE TABLE "loan_payments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "loanId" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "account" character varying(20) NOT NULL, "paidOn" date NOT NULL, "note" text, "userId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_db75e38243b5f2cb9e728da4d0f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c0268488cc84d23c1e5c6c1910" ON "loan_payments"  ("loanId") `);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "spendings" ADD CONSTRAINT "FK_3749fc09ac420c5aeec97eef7d6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ledger_entries" ADD CONSTRAINT "FK_6c70d1c965d029dcd2af34025db" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ledger_entries" ADD CONSTRAINT "FK_14edcf4e17fe71674a3e704d40d" FOREIGN KEY ("incomeId") REFERENCES "incomes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ledger_entries" ADD CONSTRAINT "FK_243ac1e1f122df812781d574162" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ledger_entries" ADD CONSTRAINT "FK_cb956cf9ff53265d9cab08f1b21" FOREIGN KEY ("loanPaymentId") REFERENCES "loan_payments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "incomes" ADD CONSTRAINT "FK_f6b7c6bbe04a203dfc67ae627ab" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_settings" ADD CONSTRAINT "FK_986a2b6d3c05eb4091bb8066f78" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "recurring_expenses" ADD CONSTRAINT "FK_c3a0703f52dda84b1df25ce1959" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "planned_expenses" ADD CONSTRAINT "FK_6f7887432c17704c73bf739a05f" FOREIGN KEY ("recurringExpenseId") REFERENCES "recurring_expenses"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "planned_expenses" ADD CONSTRAINT "FK_a8744a8c025285a4ae4f63f7dfc" FOREIGN KEY ("spendingId") REFERENCES "spendings"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "planned_expenses" ADD CONSTRAINT "FK_77d0d67f0ecd22f54aebb0af345" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "loans" ADD CONSTRAINT "FK_4c2ab4e556520045a2285916d45" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "loan_payments" ADD CONSTRAINT "FK_c0268488cc84d23c1e5c6c1910d" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "loan_payments" ADD CONSTRAINT "FK_4e7e72f48918680bfaac520566f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "loan_payments" DROP CONSTRAINT "FK_4e7e72f48918680bfaac520566f"`);
        await queryRunner.query(`ALTER TABLE "loan_payments" DROP CONSTRAINT "FK_c0268488cc84d23c1e5c6c1910d"`);
        await queryRunner.query(`ALTER TABLE "loans" DROP CONSTRAINT "FK_4c2ab4e556520045a2285916d45"`);
        await queryRunner.query(`ALTER TABLE "planned_expenses" DROP CONSTRAINT "FK_77d0d67f0ecd22f54aebb0af345"`);
        await queryRunner.query(`ALTER TABLE "planned_expenses" DROP CONSTRAINT "FK_a8744a8c025285a4ae4f63f7dfc"`);
        await queryRunner.query(`ALTER TABLE "planned_expenses" DROP CONSTRAINT "FK_6f7887432c17704c73bf739a05f"`);
        await queryRunner.query(`ALTER TABLE "recurring_expenses" DROP CONSTRAINT "FK_c3a0703f52dda84b1df25ce1959"`);
        await queryRunner.query(`ALTER TABLE "user_settings" DROP CONSTRAINT "FK_986a2b6d3c05eb4091bb8066f78"`);
        await queryRunner.query(`ALTER TABLE "incomes" DROP CONSTRAINT "FK_f6b7c6bbe04a203dfc67ae627ab"`);
        await queryRunner.query(`ALTER TABLE "ledger_entries" DROP CONSTRAINT "FK_cb956cf9ff53265d9cab08f1b21"`);
        await queryRunner.query(`ALTER TABLE "ledger_entries" DROP CONSTRAINT "FK_243ac1e1f122df812781d574162"`);
        await queryRunner.query(`ALTER TABLE "ledger_entries" DROP CONSTRAINT "FK_14edcf4e17fe71674a3e704d40d"`);
        await queryRunner.query(`ALTER TABLE "ledger_entries" DROP CONSTRAINT "FK_6c70d1c965d029dcd2af34025db"`);
        await queryRunner.query(`ALTER TABLE "spendings" DROP CONSTRAINT "FK_3749fc09ac420c5aeec97eef7d6"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c0268488cc84d23c1e5c6c1910"`);
        await queryRunner.query(`DROP TABLE "loan_payments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4c2ab4e556520045a2285916d4"`);
        await queryRunner.query(`DROP TABLE "loans"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_07038add3917e2565463f64f84"`);
        await queryRunner.query(`DROP TABLE "planned_expenses"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c3a0703f52dda84b1df25ce195"`);
        await queryRunner.query(`DROP TABLE "recurring_expenses"`);
        await queryRunner.query(`DROP TABLE "user_settings"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1e78aad3f8608013496aa8e491"`);
        await queryRunner.query(`DROP TABLE "incomes"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_54ce48aa99842c5ab30057f548"`);
        await queryRunner.query(`DROP TABLE "ledger_entries"`);
        await queryRunner.query(`DROP TABLE "spendings"`);
        await queryRunner.query(`DROP TABLE "sessions"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
