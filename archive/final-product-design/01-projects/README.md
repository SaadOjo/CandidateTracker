# Projects

Route: `/projects`

## Purpose

Show active hiring projects and let users enter a project pipeline.

## Access

Human Resource and hiring managers can open the page.

Human Resource can create projects and edit active projects.

Hiring managers cannot create or edit projects.

## Data Shown

Each active project card shows project status, project name, position, candidate count, and an entry arrow.

If an active project has an accepted offer, show `CANDIDATE ACCEPTED` instead of `ACTIVE`.

The page also shows one Archived Projects card with the archived project count.

## Controls

Search project input exists. Backend should support search by project name and position.

Project card opens `/projects/:projectId/pipeline/pre_interview`.

Archived Projects card opens `/projects/archived`.

Launch New Project opens `/projects/new`. Human Resource only.

Edit Project opens `/projects/:projectId/edit`. Human Resource only, active projects only.

## Cannot Do

No candidate actions from this page.

No archive action directly from the project card.

No project creation for hiring managers.

No project edit for archived projects.

## Backend Needs

List projects with candidate count and accepted-offer flag.

Filter active projects by default.

Return enough assignment data to decide edit access.
