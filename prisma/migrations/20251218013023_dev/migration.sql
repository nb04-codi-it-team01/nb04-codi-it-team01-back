-- AlterTable
CREATE SEQUENCE sizes_id_seq;
ALTER TABLE "sizes" ALTER COLUMN "id" SET DEFAULT nextval('sizes_id_seq');
ALTER SEQUENCE sizes_id_seq OWNED BY "sizes"."id";
