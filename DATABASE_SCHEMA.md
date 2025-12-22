# Database Schema Documentation

This document outlines the database structure for the Lumos Platform. The application uses SQLite.

## Overview

The database consists of the following tables:
- `users`: Stores user accounts and authentication details.
- `resources`: The core table for all content types (photos, music, videos, articles, events).
- `comments`: User comments on resources.
- `settings`: Global application settings.
- `audit_logs`: Records of administrative actions.

## Table Definitions

### 1. users
Stores user information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Unique identifier |
| `username` | TEXT UNIQUE | Login username |
| `password` | TEXT | Bcrypt hashed password |
| `role` | TEXT | User role (e.g., 'user', 'admin'). Default: 'user' |
| `avatar` | TEXT | URL to avatar image |
| `nickname` | TEXT | Display name |
| `created_at` | DATETIME | Creation timestamp |
| `updated_at` | DATETIME | Last update timestamp |

### 2. resources
Unified table for all content types.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Unique identifier |
| `type` | TEXT | Resource type: 'photo', 'music', 'video', 'article', 'event' |
| `title` | TEXT | Title of the resource |
| `description` | TEXT | Short description or excerpt |
| `content` | TEXT | Full content (HTML allowed for articles) |
| `file_url` | TEXT | URL to the main file (image, audio, video) |
| `cover_url` | TEXT | URL to the cover image or thumbnail |
| `category` | TEXT | Category name |
| `tags` | TEXT | Comma-separated tags |
| `featured` | BOOLEAN | 1 if featured, 0 otherwise |
| `views` | INTEGER | View count |
| `likes` | INTEGER | Like count |
| `status` | TEXT | 'pending', 'approved', 'rejected' |
| `uploader_id` | INTEGER | FK to `users.id` |
| `extra_data` | TEXT | JSON string for type-specific fields |
| `created_at` | DATETIME | Creation timestamp |
| `updated_at` | DATETIME | Last update timestamp |
| `deleted_at` | DATETIME | Soft delete timestamp |

#### JSON Structure for `extra_data`
The `extra_data` column contains a JSON string with fields specific to the resource type:

- **Photo**: `{ "size": "string", "gameType": "string", "gameDescription": "string" }`
- **Music**: `{ "artist": "string", "duration": "string" }`
- **Video**: `{ "duration": "string" }` (optional)
- **Article**: `{ "date": "string" }`
- **Event**: `{ "date": "string", "location": "string", "link": "string" }`

### 3. comments
Stores comments on resources.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Unique identifier |
| `resource_id` | INTEGER | FK to `resources.id` |
| `user_id` | INTEGER | FK to `users.id` |
| `content` | TEXT | Comment text |
| `created_at` | DATETIME | Creation timestamp |

### 4. settings
Key-value store for site configuration.

| Column | Type | Description |
|--------|------|-------------|
| `key` | TEXT PRIMARY KEY | Setting key (e.g., 'site_title') |
| `value` | TEXT | Setting value |
| `updated_at` | DATETIME | Last update timestamp |

### 5. audit_logs
Logs administrative actions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Unique identifier |
| `user_id` | INTEGER | ID of the user performing the action |
| `action` | TEXT | Action name (e.g., 'DELETE_USER') |
| `details` | TEXT | Description or JSON details of the action |
| `created_at` | DATETIME | Timestamp of the action |

## Initialization
- The database is initialized using `node server/rebuild_db.js`.
- Initial data is seeded using `node server/seed.js`.
