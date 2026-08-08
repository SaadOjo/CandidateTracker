-- Rename role enum values to match product terminology.
ALTER TYPE "Role" RENAME VALUE 'hr_manager' TO 'human_resource';
ALTER TYPE "ProjectMemberRole" RENAME VALUE 'hr' TO 'human_resource';
ALTER TYPE "NoteVisibility" RENAME VALUE 'hr_only' TO 'human_resource_only';
