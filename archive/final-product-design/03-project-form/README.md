# Project Form

Routes: `/projects/new`, `/projects/:projectId/edit`

This is a modal over the Projects page.

## Access

Human Resource can create and edit projects.

Hiring managers cannot create or edit projects.

## Create Mode

Title: Create New Project.

Submit label: Create Project.

Required fields:

- Project Name
- Job Position Name
- Hiring Manager
- Assigned Human Resource Users

Optional fields:

- Notes
- Recruiter Project ID
- Import Source

LinkedIn setup options:

- Import Shortlisted Candidates from LinkedIn
- Recruiter Project ID
- Auto-Sync
- Manual Import

After create, go to `/projects/:projectId/pipeline/pre_interview`.

## Edit Mode

Title: Edit Project.

Submit label: Save.

Fields are prefilled from the project.

Archive Project is available.

Archive confirmation copy changes depending on whether the project has an accepted offer, but the action is still available.

After save, return to `/projects`.

After archive, go to `/projects/archived`.

## Cannot Do

Cannot create without required fields.

Cannot assign users outside known Human Resource and hiring-manager users.

Cannot choose Manual Import and Auto-Sync together.

Cannot archive without confirmation.

## Backend Needs

Create project command.

Update project command.

Archive project command.

Assignable users endpoint filtered by role.

LinkedIn project lookup or stored external project id.

Validation should live on the backend even if the frontend repeats it.
