# 📱 PocketPal

PocketPal is a modern, production-grade full-stack personal finance, budget, and expense tracker web application. It enables users to record income/expenses, configure dynamic monthly budgets, monitor custom categories, execute automated recurring subscriptions, and visualize interactive financial trends.

Designed with a robust, modular architectural model, PocketPal strictly separates business logic and implements industry-standard security features to demonstrate enterprise-ready software development.

---

## 🚀 Tech Stack

### Frontend
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white)
![Lucide Icons](https://img.shields.io/badge/Lucide_Icons-FF6F61?style=for-the-badge&logo=lucide&logoColor=white)

### Backend & Authentication
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=json-web-tokens&logoColor=000000)
![Bcrypt](https://img.shields.io/badge/Bcrypt-4F4F4F?style=for-the-badge&logo=lock&logoColor=white)

### Database & Operations
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)

### Miscellaneous Badges
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![REST API](https://img.shields.io/badge/REST_API-0052CC?style=for-the-badge&logo=api&logoColor=white)
![Responsive Design](https://img.shields.io/badge/Responsive_Design-4CAF50?style=for-the-badge&logo=responsive&logoColor=white)

---

## 📍 Table of Contents
1. [About the Project](#-about-the-project)
2. [Key Features](#-key-features)
3. [Visual Previews](#-visual-previews)
4. [Tech Stack Matrix](#-tech-stack-matrix)
5. [Architecture & Flow](#-architecture--flow)
6. [Folder Structure](#-folder-structure)
7. [Installation & Local Setup](#-installation--local-setup)
8. [Environment Configuration](#-environment-configuration)
9. [API Documentation](#-api-documentation)
10. [Available Scripts](#-available-scripts)
11. [Database Schema](#-database-schema)
12. [Security Architecture](#-security-architecture)
13. [Mobile Responsiveness](#-mobile-responsiveness)
14. [Future Roadmap](#-future-roadmap)
15. [Contributing](#-contributing)
16. [License](#-license)
17. [Contact / Support](#-contact--support)

---

## 📖 About the Project

Managing personal finance can be complex, fragmented, and visually confusing. **PocketPal** was built to solve this problem by consolidating budget enforcement, transaction recording, saving tracking, and real-time alerts into a beautiful, integrated user workspace.

This project goes beyond typical side projects to demonstrate a highly disciplined software architecture. It represents:
* **The Recruiter Advantage**: Highly organized modular structures showing how backends can cleanly scale while shielding direct database layers.
* **Problem Solved**: Gives users immediate situational clarity on their financial limits. Prevents impulsive purchases through real-time notifications when a budget reaches warning thresholds.
* **Engineering Objectives**: Implement a bulletproof security layer, elegant type-safe operations across Node and React, and fully automated transaction handling.

---

## ✨ Key Features

* **🛡️ Secure User Access**: Supabase email auth integrated with custom JSON Web Tokens (JWT) and secure HTTP headers. Offers pre-filled, non-intrusive redirection state handlers.
* **📈 Rich Dashboard Workspace**: High-level statistical summaries displaying net savings, current monthly balance, active progress rings, and warning indicators.
* **💰 Budget Limit Warning Enforcements**: Set hard limit budgets for any category. Automatically triggers system alerts and changes color schemes to warning states when exceeding thresholds.
* **💸 Seamless Transaction Managers**: Granular controls for adding, editing, filtering, searching, and deleting individual transactions (both Incomes and Expenses).
* **🔄 Automated Daemon Recurring Service**: Background automation engine that evaluates active subscriptions and due recurring payments on periodic intervals, automatically logging transactions and sending in-app notifications.
* **📊 Visual Charts & Analytics**: Beautiful dynamic visualizers using SVG/CSS/Canvas elements to break down expenditures per category and track historical cash flows.
* **🎯 Savings Goals Trackers**: Visual progress meters that allow users to fund targeted savings accounts incrementally over time with real-time deposit/withdraw ledgers.
* **📝 Audit Logs & Logs Analytics**: Tracks security-critical actions (e.g., login attempts, profile changes, rule additions) to assure accountability.

---

## 📸 Visual Previews

### Dashboard & Analytics View
> `/assets/screenshots/dashboard.png` *(Placeholder for interactive dashboard workspace)*

### Transaction ledger
> `/assets/screenshots/ledger.png` *(Placeholder for comprehensive filterable expense/income table)*

---

## 🛠️ Tech Stack Matrix

| Layer | Technology | Purpose / Justification |
| :--- | :--- | :--- |
| **Frontend Core** | **React & TypeScript** | Client state management, modular components, declarative UI layouts. |
| **Build Tooling** | **Vite** | Lightning-fast development tooling, code splitting, and production bundle optimization. |
| **Styling** | **Tailwind CSS** | Atomic, low-overhead responsive designs, utility-first consistency. |
| **Backend Core** | **Node.js & Express.js** | Event-driven microservices architecture, highly scalable routing, request middlewares. |
| **Database** | **Supabase (PostgreSQL)** | Persistent cloud storage, relational safety, schema constraints, index configurations. |
| **Encryption** | **Bcrypt & JWT** | Advanced secure password-hashing and state-free token-based route authorization. |
| **API Client** | **Axios** | Interceptor-configured network routing to carry state-free auth headers. |

---

## 📐 Architecture & Flow

PocketPal operates on a clean, isolated multi-tier architecture to maximize modularity and protect critical infrastructure data.

```
+-------------------------------------------------------------+
|                       React Frontend                        |
|   (Component States, Local Contexts, Interceptor Routing)   |
+------------------------------+------------------------------+
                               |
                        HTTPS (REST API)
                               |
                               v
+-------------------------------------------------------------+
|                    Express Backend API                      |
| (Auth Check Middleware, Controllers, Repositories, Daemon)  |
+------------------------------+------------------------------+
                               |
                       Internal Queries
                               |
                               v
+-------------------------------------------------------------+
|                     Supabase Postgres DB                    |
|    (Tables, Primary & Foreign Key Constraints, Indexes)     |
+-------------------------------------------------------------+
```

### Key Architectural Guidelines:
1. **Zero Client DB Access**: The React client application is strictly forbidden from directly querying, updating, or deleting tables in the PostgreSQL instance. All operations flow through the Node/Express backend API.
2. **Controller-Repository Isolation**: Express routes delegate incoming requests to specialized Controllers. Controllers enforce business rules and orchestrate calls to stateful Repositories which encapsulate PostgreSQL queries.
3. **Decoupled Recurring Workers**: The background recurring processing scheduler operates as a non-blocking daemon inside the Express runtime.

---

## 📂 Folder Structure

```
pocketpal/
├── .env.example                     # Reference file for environment variables
├── package.json                     # Root project manifest & dependencies
├── tsconfig.json                    # TypeScript compiler parameters
├── server.ts                        # Unified Server entry point & Vite middleware setup
├── supabase_schema.sql              # Clean SQL migration blueprint for PostgreSQL
├── server/                          # backend Express implementation
│   ├── config/                      # database pools, connection setups
│   ├── controllers/                 # incoming route payloads & business checks
│   ├── middleware/                  # auth token extractors, error boundaries
│   ├── repositories/                # data mapper SQL routines
│   ├── routes/                      # consolidated API endpoints (v1 prefix)
│   └── services/                    # transaction processors & JWT engines
└── src/                             # frontend React client code
    ├── components/                  # modular ui pieces (inputs, layout, cards)
    ├── contexts/                    # shared state managers (Auth, App state)
    ├── views/                       # layout-specific screen components
    ├── App.tsx                      # primary application routes & router guards
    ├── index.css                    # Tailwind CSS global stylesheet
    └── main.tsx                     # React client DOM attachment point
```

---

## 💻 Installation & Local Setup

To configure a local development sandbox of PocketPal, ensure you have [Node.js (v18+)](https://nodejs.org/) installed, and proceed with the following steps.

### 1. Clone the Codebase
```bash
git clone https://github.com/yourusername/pocketpal.git
cd pocketpal
```

### 2. Install Package Dependencies
```bash
npm install
```

### 3. Initialize your PostgreSQL Database
Ensure you have a PostgreSQL or Supabase instance running. Connect to it via your favorite client (e.g. PgAdmin, DBeaver, or Supabase SQL Editor) and execute the queries inside `/supabase_schema.sql` to initialize tables, relations, and default parameters.

### 4. Set up the Environment Configuration
Create a `.env` file in the project's root directory:
```bash
cp .env.example .env
```
Fill in the database connections, Supabase keys, and secret credentials (see the [Environment Configuration](#-environment-configuration) section below).

### 5. Fire up the Development Servers
Launch both the Express backend API and the Vite bundling compiler in developer watch mode:
```bash
npm run dev
```
Open your browser to `http://localhost:3000` to interact with your secure local PocketPal instance.

---

## ⚙️ Environment Configuration

Ensure your `.env` contains correct variables before starting the server. Never commit your `.env` to public source repositories.

```env
# Server Port configuration
PORT=3000
NODE_ENV=development

# Database connection details (Supabase or stand-alone Postgres)
DATABASE_URL=postgresql://postgres:your_db_password@db.your-supabase-project.supabase.co:5432/postgres

# JWT Configurations (use high-entropy key phrases in production)
JWT_SECRET=your-extremely-long-secure-access-token-secret-phrase
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-extremely-long-secure-refresh-token-secret-phrase
JWT_REFRESH_EXPIRES_IN=7d

# Supabase Web Configurations for Email verification redirects
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-provided-by-supabase-dashboard

# CORS and Access variables
CLIENT_URL=http://localhost:3000
```

---

## 🔌 API Documentation

PocketPal features a REST API model. Consolidated endpoints use a logical `/api/v1` namespace prefix.

| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/v1/auth/register` | Create a new user login and trigger verify mail | Public |
| **POST** | `/api/v1/auth/login` | Access token authentication | Public |
| **POST** | `/api/v1/auth/logout` | Revokes the user's active session | Authenticated |
| **GET** | `/api/v1/dashboard/summary` | Fetch consolidated balance, savings metrics, and limits | Authenticated |
| **GET** | `/api/v1/expenses` | List all historical expenses (filterable/searchable) | Authenticated |
| **POST** | `/api/v1/expenses` | Register a new expense transaction | Authenticated |
| **GET** | `/api/v1/budgets` | Fetch current monthly budget limits | Authenticated |
| **POST** | `/api/v1/budgets` | Set or alter spending threshold limits | Authenticated |

---

## 📜 Available Scripts

Inside the project root, you can execute the following commands:

* `npm run dev`: Starts the TypeScript compiler and Express server with active file watchers.
* `npm run build`: Bundles the client files into `dist/` and compiles the backend into `dist/server.cjs` via esbuild.
* `npm start`: Runs the compiled standalone server in standard Node environment (`node dist/server.cjs`).
* `npm run lint`: Validates the codebase for styling, type matching, and syntax errors.

---

## 🗄️ Database Schema

The database relies on strict data integrity definitions across these main tables:

* **`Users`**: Holds base metadata (monthly income parameters, selected currency formats, name profile settings, and creation logs).
* **`Expenses`**: Transaction entries linked to a specific user and category.
* **`Income`**: Revenue records tracking periodic incoming funds.
* **`Budgets`**: User-defined spending caps assigned per-category with real-time accumulation references.
* **`Categories`**: Preconfigured system identifiers or custom-tailored user buckets.
* **`SavingsGoals`**: Targeted financial milestones with calculated percentages.
* **`Notifications`**: Real-time context feed highlighting low budgets, recurring processed, and custom notices.
* **`ActivityLogs`**: Detailed, secure audit lines tracking actions across user profiles.
* **`RecurringTransactions`**: Automatons storing rules, rules state, and next automated pay date definitions.

---

## 🔒 Security Architecture

* **State-Free JWT Authentication**: Access tokens expire in short durations (15m) and must be refreshed via highly protected refresh keys stored securely.
* **Secure Middleware Guards**: Express endpoints require validated JWT headers before letting operations touch Repository queries.
* **Password Hashing**: Cryptographic Bcrypt key-derivations assure high security against dictionary and brute-force attacks.
* **No Client DB Access**: Completely seals structural tables by forcing data interaction through strict API server logic.
* **Robust Input Sanitization**: Sanitizes payload values prior to processing query models.
* **Graceful Exception Management**: Centralized error interceptors prevent stack leaks to external interfaces.

---

## 📱 Mobile Responsiveness

PocketPal is designed with a **mobile-first interface design**. No matter if users manage assets on high-res monitors, modern tablets, or smaller mobile viewports:
* **Elastic Bento Grids**: Cards wrap dynamically depending on breakpoints.
* **Touch-Target Precision**: Buttons, tabs, inputs, and close actions occupy generous interactive margins to satisfy mobile standards (minimum 44px targets).
* **Smooth UI Interactions**: Implements lightweight layout slide effects and page transitions.

---

## 🔮 Future Roadmap

* [ ] **🎨 Dark Mode Themes**: Adaptive eye-safe night skins that map automatically to local OS configurations.
* [ ] **📶 Offline-First Support**: Client caching allowing users to add transactions without internet connectivity.
* [ ] **📅 Finance Calendar View**: Visual scheduler summarizing historical monthly expenses on a interactive calendar board.
* [ ] **📲 Progressive Web App (PWA)**: Desktop/mobile installations without requiring App Store wrappers.

---

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project Repository
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a professional Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more details.

---

## ✉️ Contact / Support

* **Name**: Your Name
* **GitHub**: [deepusteam1011](https://github.com/deepusteam1011)
* **LinkedIn**: [LinkedIn Profile](https://linkedin.com/in/yourusername)
* **Email**: deepusteam1011@gmail.com
* **Project Link**: [https://github.com/deepusteam1011/PocketPal](https://github.com/deepusteam1011/PocketPal)

If you found PocketPal helpful or liked its architectural structure, please consider giving the repository a **⭐ Star** on GitHub!

---

### Acknowledgements
* Inspiration from premium personal finance apps (Copilot, Wealthsimple, Splitwise).
* Special thanks to the React, Express, and Supabase Open Source maintainers.
