# navigation-home Specification

## Purpose

Provide each account with a private, ordered URL directory that can be backed up as bookmarks and explicitly shared as reviewed public snapshots.

## Requirements

### Requirement: Account-specific homepage

The system SHALL persist ordered URL groups for the authenticated account with optimistic version checks.

#### Scenario: Save and reload

- **WHEN** an authenticated user saves a valid draft
- **THEN** another session of that account receives the same groups and order
- **AND** another account cannot read or change those groups

#### Scenario: Concurrent save

- **WHEN** the submitted version is stale
- **THEN** the server returns a conflict without overwriting the saved workspace

#### Scenario: Edit the homepage in place

- **WHEN** a user enters homepage edit mode
- **THEN** groups and links remain in the homepage grid, with drag handles, dashed insertion targets and local link forms
- **AND** pointer, touch and keyboard ordering update only the draft until it is saved
- **AND** dragging can be cancelled without changing the order, and reduced motion is respected
- **AND** unfinished link inputs survive internal navigation with the account draft

### Requirement: Portable bookmarks

The system SHALL export ordered bookmark HTML and a versioned JSON backup.

#### Scenario: Restore a backup

- **WHEN** a valid JSON backup is imported
- **THEN** it is validated and shown as an editable draft before saving

### Requirement: Explicit public sharing

The system SHALL create share snapshots only from selected saved groups and enforce existing review permissions.

#### Scenario: Publish a selection

- **WHEN** an account submits selected group IDs from its saved workspace
- **THEN** only those groups enter the share snapshot and private edits do not modify it

#### Scenario: Reuse and withdraw

- **WHEN** another user adds an approved collection
- **THEN** its groups are appended to a draft without replacing existing groups
- **AND** later withdrawal prevents further public discovery without deleting saved copies
