-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'hr_manager', 'hiring_manager');

-- CreateEnum
CREATE TYPE "ProjectMemberRole" AS ENUM ('hr', 'hiring_manager');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('active', 'archived', 'closed');

-- CreateEnum
CREATE TYPE "CandidateSource" AS ENUM ('linkedin', 'referral', 'manual');

-- CreateEnum
CREATE TYPE "CandidateStage" AS ENUM ('pre_interview', 'department_interview', 'hr_interview', 'manager_review', 'offer_stage');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('waiting_for_contact', 'scheduled', 'not_reached', 'withdrawn', 'rejected', 'assessment_sent', 'waitlisted', 'approved_for_offer', 'final_check_sent', 'offer_sent', 'offer_rejected', 'offer_accepted', 'proceeded_with_another_candidate');

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('resume', 'portfolio', 'attachment');

-- CreateEnum
CREATE TYPE "NoteVisibility" AS ENUM ('all', 'hr_only');

-- CreateEnum
CREATE TYPE "ContactContext" AS ENUM ('pre_interview', 'department_interview', 'hr_interview', 'rejection_follow_up');

-- CreateEnum
CREATE TYPE "ContactResult" AS ENUM ('not_reached', 'scheduled', 'withdrawn', 'contact_successful', 'pre_interview_not_conducted', 'rejection_handled');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('department_interview', 'hr_interview');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('scheduled', 'rescheduled', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "RejectionFollowUpStatus" AS ENUM ('waiting_for_contact', 'not_reached', 'handled');

-- CreateEnum
CREATE TYPE "RejectionFollowUpReason" AS ENUM ('rejected', 'proceeded_with_another_candidate');

-- CreateEnum
CREATE TYPE "OfferQueueItemStatus" AS ENUM ('waiting', 'active', 'completed', 'skipped', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('final_check_sent', 'offer_sent', 'offer_accepted', 'offer_rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "ExternalResourceType" AS ENUM ('project', 'candidate', 'candidate_application');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "oidc_subject" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "closure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "hired_application_id" TEXT,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_role" "ProjectMemberRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "source" "CandidateSource" NOT NULL DEFAULT 'linkedin',
    "linkedin_profile_url" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_synced_at" TIMESTAMP(3),

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_applications" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "stage" "CandidateStage" NOT NULL,
    "status" "CandidateStatus" NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_at" TIMESTAMP(3),
    "applied_label" TEXT,
    "duplicate_warning" BOOLEAN NOT NULL DEFAULT false,
    "closure_reason" TEXT,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT,
    "candidate_application_id" TEXT,
    "project_id" TEXT,
    "kind" "FileKind" NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "content" BYTEA,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_stage_comments" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "stage" "CandidateStage" NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "author_role" "ProjectMemberRole" NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_stage_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_notes" (
    "id" TEXT NOT NULL,
    "candidate_application_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "author_role" "ProjectMemberRole" NOT NULL,
    "visibility" "NoteVisibility" NOT NULL DEFAULT 'all',
    "body" TEXT,
    "fields" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_attempts" (
    "id" TEXT NOT NULL,
    "candidate_application_id" TEXT NOT NULL,
    "rejection_follow_up_id" TEXT,
    "context" "ContactContext" NOT NULL,
    "result" "ContactResult" NOT NULL,
    "attempted_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "candidate_application_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "type" "InterviewType" NOT NULL,
    "status" "InterviewStatus" NOT NULL DEFAULT 'scheduled',
    "scheduled_start_at" TIMESTAMP(3) NOT NULL,
    "scheduled_end_at" TIMESTAMP(3),
    "timezone" TEXT NOT NULL,
    "meeting_url" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "candidate_application_id" TEXT,
    "project_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "actor_user_id" TEXT,
    "actor_role" "Role",
    "source_type" TEXT,
    "source_id" TEXT,
    "metadata_json" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rejection_follow_ups" (
    "id" TEXT NOT NULL,
    "candidate_application_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "status" "RejectionFollowUpStatus" NOT NULL DEFAULT 'waiting_for_contact',
    "reason" "RejectionFollowUpReason" NOT NULL,
    "eligible_at" TIMESTAMP(3) NOT NULL,
    "handled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rejection_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_offer_queue_items" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "candidate_application_id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "status" "OfferQueueItemStatus" NOT NULL DEFAULT 'waiting',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_offer_queue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "candidate_application_id" TEXT NOT NULL,
    "offer_queue_item_id" TEXT,
    "status" "OfferStatus" NOT NULL,
    "final_check_sent_at" TIMESTAMP(3),
    "offer_sent_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_references" (
    "id" TEXT NOT NULL,
    "project_id" TEXT,
    "candidate_id" TEXT,
    "candidate_application_id" TEXT,
    "resource_type" "ExternalResourceType" NOT NULL,
    "provider" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "external_url" TEXT,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_references_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_oidc_subject_key" ON "users"("oidc_subject");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "projects_hired_application_id_key" ON "projects"("hired_application_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "project_members_user_id_idx" ON "project_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_project_id_user_id_project_role_key" ON "project_members"("project_id", "user_id", "project_role");

-- CreateIndex
CREATE INDEX "candidates_full_name_idx" ON "candidates"("full_name");

-- CreateIndex
CREATE INDEX "candidate_applications_project_id_stage_idx" ON "candidate_applications"("project_id", "stage");

-- CreateIndex
CREATE INDEX "candidate_applications_project_id_status_idx" ON "candidate_applications"("project_id", "status");

-- CreateIndex
CREATE INDEX "candidate_applications_candidate_id_idx" ON "candidate_applications"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_applications_project_id_candidate_id_key" ON "candidate_applications"("project_id", "candidate_id");

-- CreateIndex
CREATE INDEX "files_candidate_id_idx" ON "files"("candidate_id");

-- CreateIndex
CREATE INDEX "files_candidate_application_id_idx" ON "files"("candidate_application_id");

-- CreateIndex
CREATE INDEX "files_project_id_idx" ON "files"("project_id");

-- CreateIndex
CREATE INDEX "project_stage_comments_project_id_stage_idx" ON "project_stage_comments"("project_id", "stage");

-- CreateIndex
CREATE INDEX "candidate_notes_candidate_application_id_created_at_idx" ON "candidate_notes"("candidate_application_id", "created_at");

-- CreateIndex
CREATE INDEX "candidate_notes_author_user_id_idx" ON "candidate_notes"("author_user_id");

-- CreateIndex
CREATE INDEX "contact_attempts_candidate_application_id_context_attempted_idx" ON "contact_attempts"("candidate_application_id", "context", "attempted_at");

-- CreateIndex
CREATE INDEX "contact_attempts_rejection_follow_up_id_idx" ON "contact_attempts"("rejection_follow_up_id");

-- CreateIndex
CREATE INDEX "interviews_candidate_application_id_type_idx" ON "interviews"("candidate_application_id", "type");

-- CreateIndex
CREATE INDEX "interviews_project_id_scheduled_start_at_idx" ON "interviews"("project_id", "scheduled_start_at");

-- CreateIndex
CREATE INDEX "activity_events_candidate_application_id_occurred_at_idx" ON "activity_events"("candidate_application_id", "occurred_at");

-- CreateIndex
CREATE INDEX "activity_events_project_id_occurred_at_idx" ON "activity_events"("project_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "rejection_follow_ups_candidate_application_id_key" ON "rejection_follow_ups"("candidate_application_id");

-- CreateIndex
CREATE INDEX "rejection_follow_ups_project_id_status_eligible_at_idx" ON "rejection_follow_ups"("project_id", "status", "eligible_at");

-- CreateIndex
CREATE UNIQUE INDEX "project_offer_queue_items_candidate_application_id_key" ON "project_offer_queue_items"("candidate_application_id");

-- CreateIndex
CREATE INDEX "project_offer_queue_items_project_id_status_idx" ON "project_offer_queue_items"("project_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "project_offer_queue_items_project_id_rank_key" ON "project_offer_queue_items"("project_id", "rank");

-- CreateIndex
CREATE INDEX "offers_project_id_status_idx" ON "offers"("project_id", "status");

-- CreateIndex
CREATE INDEX "offers_candidate_application_id_idx" ON "offers"("candidate_application_id");

-- CreateIndex
CREATE INDEX "external_references_project_id_idx" ON "external_references"("project_id");

-- CreateIndex
CREATE INDEX "external_references_candidate_id_idx" ON "external_references"("candidate_id");

-- CreateIndex
CREATE INDEX "external_references_candidate_application_id_idx" ON "external_references"("candidate_application_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_references_provider_resource_type_external_id_key" ON "external_references"("provider", "resource_type", "external_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_hired_application_id_fkey" FOREIGN KEY ("hired_application_id") REFERENCES "candidate_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_candidate_application_id_fkey" FOREIGN KEY ("candidate_application_id") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_stage_comments" ADD CONSTRAINT "project_stage_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_stage_comments" ADD CONSTRAINT "project_stage_comments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_notes" ADD CONSTRAINT "candidate_notes_candidate_application_id_fkey" FOREIGN KEY ("candidate_application_id") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_notes" ADD CONSTRAINT "candidate_notes_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_attempts" ADD CONSTRAINT "contact_attempts_candidate_application_id_fkey" FOREIGN KEY ("candidate_application_id") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_attempts" ADD CONSTRAINT "contact_attempts_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_attempts" ADD CONSTRAINT "contact_attempts_rejection_follow_up_id_fkey" FOREIGN KEY ("rejection_follow_up_id") REFERENCES "rejection_follow_ups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidate_application_id_fkey" FOREIGN KEY ("candidate_application_id") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_candidate_application_id_fkey" FOREIGN KEY ("candidate_application_id") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rejection_follow_ups" ADD CONSTRAINT "rejection_follow_ups_candidate_application_id_fkey" FOREIGN KEY ("candidate_application_id") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rejection_follow_ups" ADD CONSTRAINT "rejection_follow_ups_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_offer_queue_items" ADD CONSTRAINT "project_offer_queue_items_candidate_application_id_fkey" FOREIGN KEY ("candidate_application_id") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_offer_queue_items" ADD CONSTRAINT "project_offer_queue_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_candidate_application_id_fkey" FOREIGN KEY ("candidate_application_id") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_offer_queue_item_id_fkey" FOREIGN KEY ("offer_queue_item_id") REFERENCES "project_offer_queue_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "external_references_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "external_references_candidate_application_id_fkey" FOREIGN KEY ("candidate_application_id") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "external_references_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "files"
  ADD CONSTRAINT "files_exactly_one_owner_check"
  CHECK (num_nonnulls("candidate_id", "candidate_application_id", "project_id") = 1);

-- AddCheckConstraint
ALTER TABLE "external_references"
  ADD CONSTRAINT "external_references_owner_matches_resource_type_check"
  CHECK (
    ("resource_type" = 'project' AND "project_id" IS NOT NULL AND "candidate_id" IS NULL AND "candidate_application_id" IS NULL)
    OR ("resource_type" = 'candidate' AND "candidate_id" IS NOT NULL AND "project_id" IS NULL AND "candidate_application_id" IS NULL)
    OR ("resource_type" = 'candidate_application' AND "candidate_application_id" IS NOT NULL AND "project_id" IS NULL AND "candidate_id" IS NULL)
  );

-- AddCheckConstraint
ALTER TABLE "candidate_applications"
  ADD CONSTRAINT "candidate_applications_stage_status_check"
  CHECK (
    ("stage" = 'pre_interview' AND "status" IN ('waiting_for_contact', 'scheduled', 'not_reached', 'withdrawn', 'rejected'))
    OR ("stage" = 'department_interview' AND "status" IN ('waiting_for_contact', 'scheduled', 'not_reached', 'withdrawn', 'rejected'))
    OR ("stage" = 'hr_interview' AND "status" IN ('waiting_for_contact', 'scheduled', 'not_reached', 'withdrawn', 'rejected', 'assessment_sent'))
    OR ("stage" = 'manager_review' AND "status" IN ('waiting_for_contact', 'rejected', 'waitlisted', 'approved_for_offer'))
    OR ("stage" = 'offer_stage' AND "status" IN ('rejected', 'approved_for_offer', 'final_check_sent', 'offer_sent', 'offer_rejected', 'offer_accepted', 'proceeded_with_another_candidate'))
  );

-- CreateIndex
CREATE UNIQUE INDEX "project_offer_queue_items_one_active_per_project_idx"
  ON "project_offer_queue_items"("project_id")
  WHERE "status" = 'active';

-- CreateIndex
CREATE UNIQUE INDEX "offers_one_active_per_project_idx"
  ON "offers"("project_id")
  WHERE "status" IN ('final_check_sent', 'offer_sent');

-- CreateIndex
CREATE UNIQUE INDEX "offers_one_accepted_per_project_idx"
  ON "offers"("project_id")
  WHERE "status" = 'offer_accepted';
