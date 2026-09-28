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

### Requirement: Deferred public sharing

The system SHALL keep the URL plaza unavailable until its release is explicitly enabled, while retaining existing collection data.

#### Scenario: Browse the homepage

- **WHEN** a visitor opens the homepage, including a previous `?view=plaza` link
- **THEN** the homepage shows no plaza tabs or sharing controls and provides an edit action at the upper right

#### Scenario: Access collection APIs before release

- **WHEN** any client reads, creates or changes a navigation collection
- **THEN** the production API returns 404 with no-store headers without exposing or mutating collections
