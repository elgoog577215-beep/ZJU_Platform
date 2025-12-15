# Lumos Portfolio

A futuristic, immersive portfolio website featuring 3D interactions, smooth animations, and a comprehensive admin dashboard.

## 🚀 Tech Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Framer Motion
- **3D Graphics**: Three.js + React Three Fiber
- **State/Data**: SWR + Axios
- **I18n**: i18next (Internationalization support)

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Database**: SQLite (Embedded, no extra setup required)
- **Security**: JWT, Helmet, Rate Limiting

## 🛠️ Getting Started

### Prerequisites
- Node.js (v16 or higher recommended)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone git@github.com:elgoog577215-beep/ZJU_Platform.git
   cd ZJU_Platform
   ```

2. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd server
   npm install
   ```

### Running the Project

You need to run both the frontend and backend servers.

1. **Start the Backend Server**
   Open a terminal:
   ```bash
   cd server
   npm start
   ```
   The server will run on `http://localhost:3001`.
   *It will automatically seed the database if it doesn't exist.*

2. **Start the Frontend Development Server**
   Open a new terminal in the project root:
   ```bash
   npm run dev
   ```
   The site will be available at `http://localhost:5173`.

## 🔑 Admin Access

The website includes a powerful Admin Dashboard for managing content (Photos, Music, Videos, Articles, Events, Users, etc.).

- **URL**: `http://localhost:5173/admin`
- **Access Code**: `12345`

> **Note**: The admin login is simplified to a passcode-only verification for ease of use.

## 📂 Project Structure

```
├── public/             # Static assets (images, locales, etc.)
├── src/                # Frontend source code
│   ├── components/     # React components (Admin, Layout, UI, etc.)
│   ├── pages/          # Main page layouts
│   ├── services/       # API configuration
│   └── ...
├── server/             # Backend source code
│   ├── src/            # Controllers, Routes, Middleware
│   ├── uploads/        # User uploaded files storage
│   └── database.sqlite # SQLite database file
└── ...
```

## ✨ Features

- **Immersive Home**: 3D background and interactive elements.
- **Media Gallery**: Manage and view Photos, Music, and Videos.
- **Blog/Articles**: Reading and writing articles.
- **Event Management**: Calendar view, event registration, and external event crawling.
- **User System**: User registration, profile management, and role-based access.
- **Admin Dashboard**: 
  - Full CRUD operations for all resources.
  - Real-time file management system.
  - Audit logs and system statistics.
  - Visual content editor.
- **Responsive Design**: Optimized for desktop and mobile devices.

---
Created with ❤️ by Trae.
