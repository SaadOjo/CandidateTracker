# Archived Projects

Route: `/projects/archived`

## Purpose

Show completed or archived hiring projects.

## Access

HR and hiring managers can open the page.

## Data Shown

Archived project cards show project status, project name, position, candidate count, and entry arrow.

## Controls

Search archived project input exists. Backend should support search by project name and position.

Project card opens `/projects/:projectId/pipeline/pre_interview`.

Breadcrumb returns to `/projects`.

## Cannot Do

No Launch New Project card.

No Archived Projects card.

No Edit Project link.

No archive or restore action from this page.

## Backend Needs

List archived projects separately from active projects.

Archived projects should remain readable but should block normal workflow mutations unless a later restore flow is added.
