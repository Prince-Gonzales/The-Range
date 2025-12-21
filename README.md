# The Range — 3D Aim Training & Virtual Learning Experience

## Project Story & Concept

The Range is an immersive 3D aim‑training experience built for the browser. It simulates a virtual firing range where users can practice their accuracy and reaction time across three difficulty levels: Beginner, Intermediate, and Professional. Each session blends reflex training, spatial awareness, and decision‑making under time pressure. It provides instant feedback through accuracy, score, and achievements, turning deliberate practice into an engaging learning loop. The project features real-time 3D rendering using Three.js, pointer-lock controls, and a full-stack architecture for tracking personal high scores.

**Educational goals:**
- Build hand–eye coordination and reaction time
- Improve spatial reasoning and target prioritization
- Encourage data‑driven self‑assessment with high‑scores and post‑game analytics

## Relevance to XR/Game/3D Learning

- Uses real‑time 3D rendering to simulate a training range with dynamic targets
- Pointer‑lock controls, physics‑like motion, collision checks, spatial audio
- Structured difficulty tiers that scaffold learning from fundamentals to mastery

## Features

- Three difficulty modes with tuned target count, speed, and timing
- Realistic GLTF weapon, background textures, and multi‑instance audio
- Authenticated sessions with JWT cookies and personal high‑scores
- Live HUD: score, timer, accuracy; post‑game achievements and summary
- Resilient asset loading with progress UI and graceful fallbacks

## Architecture

Full‑stack, modular design with clear separation of concerns:

### Frontend (Vite + Three.js)
- `src/main.js`: game loop, input, shooting, collisions, scoring
- `src/manager.js`: UIManager for HUD, loading screen, toasts, post‑game overlay
- `src/components/Target.js`: target lifecycle, movement, collision
- `src/levels/*.js`: difficulty configs (Beginner/Intermediate/Professional)
- `index.html` + `public/*`: static assets (textures, model, audio, CSS)

### Backend (Express)
**Folder renamed from server → api**
- `api/index.js`: auth, score APIs, cookie/JWT handling, CORS
- `api/db.js`: Neon PostgreSQL pool, schema init, queries, upsert best scores

### Database (Neon PostgreSQL)
- `users`: identity and password hash
- `user_scores`: best score per difficulty with constraints and indices

### Runtime Topology

```
Browser (Vite 5173) ── proxy /api ──► Express API (3001) ──► Neon PostgreSQL
         Three.js game                      Auth & Scores      users, user_scores
```

## Schemas

```sql
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE public.user_scores (
    username TEXT,
    user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('Beginner','Intermediate','Professional')),
    best_score INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, mode)
);
```

### Utility Queries

```sql
SELECT * FROM public.users;

SELECT * FROM public.user_scores;

TRUNCATE TABLE public.user_scores; 
TRUNCATE TABLE public.users RESTART IDENTITY CASCADE;
```

## Development Stack

- **Frontend:** Vite, Three.js, PointerLockControls, GLTFLoader
- **Backend:** Express, CORS, cookie‑parser, bcrypt, jsonwebtoken
- **Database:** Neon PostgreSQL (via pg node client)
- **Configuration:** `.env` via `dotenv`
- **Testing:** Vitest (unit), Supertest (API)

## Required Packages and Libraries

This project relies on the following key technologies and libraries to function correctly.

### Frontend Dependencies

- **Three.js (^0.164.0):** The core 3D engine used for rendering the environment, weapon models, and targets.
- **Vite (^4.4.9):** A high-performance development server and build tool.
- **PointerLockControls:** Handles first-person mouse controls within the 3D scene.
- **GLTFLoader:** Used to load 3D assets such as the weapon model.

### Backend & Database Dependencies

- **Express (^4.19.2):** Framework used to build the REST API for authentication and score management.
- **pg (^8.16.3):** PostgreSQL client used to connect the application to the Neon database.
- **jsonwebtoken (JWT) (^9.0.2):** Manages secure user sessions via cookies.
- **bcrypt (^5.1.1):** Used for secure password hashing.
- **dotenv (^17.2.3):** Manages environment variables from the .env file.
- **cors (^2.8.5):** Enables cross-origin resource sharing between the frontend and backend.
- **cookie-parser (^1.4.6):** Parses cookies for session authentication.


## Setup & Installation

### Prerequisites

### 1. Git
Git is used for cloning the repository and managing version control.

- **Download:** https://git-scm.com/downloads  
- **Verification:**  
  Run the following command in your terminal:
  ```bash
  git --version


###  2. Node.js (Version 18+)
The runtime environment required to run both the Vite frontend and Express backend.

- **Download:** https://nodejs.org/en

- **Verification:**   Run node -v and npm -v in your terminal.

## If cloning the repository

- Navigate into the project directory `cd "The-Range"`
- `npm install`
- Start the backend server and the frontend environment simultaneously in two separate terminals.
  - Terminal 1: `npm run server`
  - Terminal 2: `npm run dev`


## Environment Configuration
- Important Note on .env: If cloning this project, since the .env file is included in the repository, we recommend using the repository's provided .env file. It is already configured to connect to our live Neon PostgreSQL Database, allowing you to run the project immediately without setting up a local database.


### Steps for PostgreSQL pgAdmin4 (Local)

1. Create database: `The-Range-DB`
2. Edit `.env`:
   ```
   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=The-Range-DB
   PGUSER=your_postgres_username
   PGPASSWORD=your_postgres_password
   JWT_SECRET=mySecretKey123
   ```

3. Use these schemas:
   ```sql
   CREATE TABLE IF NOT EXISTS public.users (
       id BIGSERIAL PRIMARY KEY,
       first_name TEXT NOT NULL,
       last_name TEXT NOT NULL,
       username TEXT NOT NULL UNIQUE,
       password_hash TEXT NOT NULL,
       created_at TIMESTAMP NOT NULL DEFAULT NOW()
   );

   CREATE TABLE public.user_scores (
       username TEXT,
       user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
       mode TEXT NOT NULL CHECK (mode IN ('Beginner','Intermediate','Professional')),
       best_score INTEGER NOT NULL DEFAULT 0,
       updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
       PRIMARY KEY (user_id, mode)
   );
   ```

4. Utility Queries:
   ```sql
   SELECT * FROM public.users;

   SELECT * FROM public.user_scores;
   ```

### Steps for Neon PostgreSQL database (cloud)

#### (if creating your own database)

- Go to this link: https://neon.com/
- Sign up and Log in
- Fill up "Project Name"
- Postgres Version (default)
- Cloud service provider: (AWS)
- Region: (AWS Asia Pacific 1 (Singapore))
- Create Project

- Click the "Connect" button in the left side with a label "Connect to your database"
- Input all the information shown in your .env file and click "Copy Snippet" to copy your connection string

#### EXAMPLE (what it looks like in your .env file):

```
DATABASE_URL=postgresql://neondb_owner:npg_9WZEG2LNdlim@ep-divine-hill-a1ym9h6z-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

PGHOST=ep-divine-hill-a1ym9h6z-pooler.ap-southeast-1.aws.neon.tech
PGPORT=5432
PGDATABASE=neondb
PGUSER=neondb_owner
PGPASSWORD=npg_9WZEG2LNdlim

JWT_SECRET=mySecretKey123
```

#### (if not creating your own database)

1. Copy the `.env`:

> **Note:** The .env file should stay as is because it is already configured in an online database which is Neon PostgreSQL Database.

```
DATABASE_URL=postgresql://neondb_owner:npg_9WZEG2LNdlim@ep-divine-hill-a1ym9h6z-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

PGHOST=ep-divine-hill-a1ym9h6z-pooler.ap-southeast-1.aws.neon.tech
PGPORT=5432
PGDATABASE=neondb
PGUSER=neondb_owner
PGPASSWORD=npg_9WZEG2LNdlim

JWT_SECRET=mySecretKey123
```

2. Install dependencies:
   - Open your terminal in the project root folder and run the following command to install all required libraries:
   ```bash
   npm install
   ```

## Running the Application

To run the project, you must start the backend server and the frontend environment simultaneously in two separate terminals.

### Step A: Start the Backend Server

In your first terminal, run:
```bash
npm run server
```

### Step B: Start the Frontend (Vite)

In a second terminal window, run:
```bash
npm run dev
```

## How to Play

- **Register/Login:** Create a new account or log in with existing credentials to start tracking your scores.
- **Select Difficulty:** Choose between Beginner, Intermediate, or Professional levels on the dashboard.
- **Start Training:** Click the 3D targets to increase your score and accuracy.
- **Avoid Collisions:** Do not let targets reach your position, or the game will end.

## API Overview

- `POST /api/auth/signup` → create account (server‑side validation)
- `POST /api/auth/login` → set `auth_token` http‑only cookie
- `POST /api/auth/logout` → clears cookie
- `GET /api/auth/me` → current user from JWT
- `GET /api/scores/me` → best scores for authenticated user
- `POST /api/scores/update` → upsert best score per difficulty

## Team Roles

- **Prince Johnard Gonzales (Backend & Database)**
  - Database: Organizes and stores all player data, scores, and account information.
  - Security: Handles user logins and passwords.

- **Ryan Ranada (Frontend & 3D)**
  - 3D Visuals: Builds the 3D shooting range environment and visual assets.
  - Gameplay: Programs how the game plays (aiming, shooting, and moving).
  - Interface: Creates the menus, scoreboards, and on-screen displays (HUD) the player sees.

## Security & Best Practices

- Strong password policy and server‑side validation
- JWT in secure, http‑only cookie with limited lifetime
- Parameterized queries and transaction use for schema init
- CORS and proxy separation between client and server

