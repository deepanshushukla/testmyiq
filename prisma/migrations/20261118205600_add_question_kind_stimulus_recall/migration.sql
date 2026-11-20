-- Delayed-recall memory questions: a STIMULUS question (shown, not scored)
-- paired with a later RECALL question (scored) whose correct answer
-- depends on that specific stimulus. docs/DEVELOPMENT_ROADMAP.md Phase 5.

CREATE TYPE "QuestionKind" AS ENUM ('STANDARD', 'STIMULUS', 'RECALL');

ALTER TABLE "Question" ADD COLUMN "kind" "QuestionKind" NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "Question" ADD COLUMN "stimulusQuestionId" TEXT;

CREATE UNIQUE INDEX "Question_stimulusQuestionId_key" ON "Question"("stimulusQuestionId");

ALTER TABLE "Question" ADD CONSTRAINT "Question_stimulusQuestionId_fkey"
  FOREIGN KEY ("stimulusQuestionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
