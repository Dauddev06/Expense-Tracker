import { MigrationInterface, QueryRunner } from "typeorm";

export class OldLoans1791643783198 implements MigrationInterface {
    name = 'OldLoans1791643783198'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "loans" ADD "alreadyExisted" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN "alreadyExisted"`);
    }

}
