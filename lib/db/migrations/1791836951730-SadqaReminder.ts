import { MigrationInterface, QueryRunner } from "typeorm";

// Sadqa is no longer a pot of money, only a reminder of what to give.
// Data only (the tables don't change):
//   1. sadqa_allocation no longer takes money out of Current, so the
//      money it moved goes back: Current gets it again.
//   2. Sadqa already given now comes out of a real account. We don't know
//      which one was meant, so old ones come out of Current (where the
//      money originally came from: the totals end up the same).
export class SadqaReminder1791836951730 implements MigrationInterface {
    name = 'SadqaReminder1791836951730'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "ledger_entries" SET "fromAccount" = NULL WHERE "type" = 'sadqa_allocation'`);
        await queryRunner.query(`UPDATE "ledger_entries" SET "fromAccount" = 'current' WHERE "type" = 'sadqa_given' AND "fromAccount" = 'sadqa'`);
    }

    // Goes back to the old way. Which account a Sadqa was given from is lost.
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "ledger_entries" SET "fromAccount" = 'sadqa' WHERE "type" = 'sadqa_given'`);
        await queryRunner.query(`UPDATE "ledger_entries" SET "fromAccount" = 'current' WHERE "type" = 'sadqa_allocation'`);
    }

}
