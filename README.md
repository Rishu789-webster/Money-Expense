# Aura: AI-Powered Expense Tracker (SDE Interview Showcase)

Aura is a full-stack, AI-powered expense intelligence tracker designed to showcase advanced software engineering principles. It integrates authentication, browser-side OCR, hybrid NLP extraction, statistical anomaly detection, and linear regression-based forecasting.

---

## 🌟 Key SDE Highlights

### 1. Cryptographic User Authentication & Profiles
Aura features a secure multi-user system where each user registers and logs in through a glassmorphic authentication view.
*   **Security Pipeline**: Passwords are securely hashed using Node.js's native `crypto` module via a **SHA-256 algorithm**.
*   **Demo User**: Initialized with a default developer demo account:
    *   **Username**: `rishabh` | **Password**: `password123`

### 2. Scoped Multi-Tenant Isolation
All REST APIs and data transactions are restricted by an authentication header validation.
*   **Header Scoping**: The frontend includes the `x-user-id` header in all request endpoints. The backend interceptor scopes all CRUD operations, category budgets, anomaly calculations, and trend forecasting strictly to that `userId`.

### 3. Interactive Monthly Allowance / Income
Users can manually configure their **Monthly Allowance/Income** directly inside their User Profile using a slide bar or numerical input.
*   **Remaining Balance Equation**: 
    $$\text{Remaining Balance} = \text{Monthly Allowance} + \text{Income (June)} - \text{Expenses (June)}$$
*   This allowance integrates across all dashboards and calculates active cash flows.

### 4. Hybrid NLP Parsing (LLM + Local Fallback)
Aura features an input logger that converts plain sentences (e.g., *"Spent ₹850 on dinner with friends yesterday"*) into structured transactions (Amount, Category, Date, and Title).
*   **LLM Pipeline**: If a `GEMINI_API_KEY` is present in the `.env` configuration, it queries Gemini via native REST calls to extract high-fidelity semantic data.
*   **Heuristic Fallback**: If the API key is missing, a custom keyword-and-regex engine parses the text locally. This ensures offline functionality.

### 5. Client-Side OCR Engine (`Tesseract.js`)
Users can drag and drop physical receipts. The application runs OCR directly **inside the browser** using Tesseract.js to extract raw text, which is then parsed by the backend to identify total values, dates, and vendor names.
*   **Optimization**: Client-side OCR offloads heavy computer vision computations from the backend to the user's browser, reducing server resource footprint.

### 6. Statistical Anomaly Detection
Every transaction is evaluated in real time against its category's historical averages. If a transaction's amount exceeds the threshold, the system flags it as an anomaly.
*   **Mathematical Formula**:
    *   **Mean ($\mu$)**: $\mu = \frac{1}{N}\sum_{i=1}^N x_i$
    *   **Standard Deviation ($\sigma$)**: $\sigma = \sqrt{\frac{1}{N}\sum_{i=1}^N (x_i - \mu)^2}$
    *   **Outlier Boundary**: $\text{Threshold} = \mu + 2\sigma$
*   Any transaction exceeding the boundary triggers an immediate alert.

### 7. Predictive Forecasting (Linear Regression)
Aura analyzes monthly spending totals to predict next month's cash flow needs.
*   **Mathematical Formula**: Fits a line $y = mx + c$ on month indices ($x$) and total spends ($y$) where:
    *   **Slope ($m$)**: $m = \frac{N\sum(xy) - \sum x \sum y}{N\sum(x^2) - (\sum x)^2}$
    *   **Intercept ($c$)**: $c = \frac{\sum y - m\sum x}{N}$
*   Projects the next index $N + 1$ to give the user a data-backed financial forecast.

### 8. Repository Pattern Data Layer
The database layer is decoupled using the **Repository Pattern** over a local JSON file structure. This ensures the application runs instantly on any local environment with **zero installation overhead** (no PostgreSQL/SQLite setup required) while making it trivial to swap to database systems like PostgreSQL or MongoDB by simply replacing the repository class.

---

## 📂 Project Structure

```text
Expensify/
├── backend/
│   ├── data/                 # Local JSON database storage
│   │   └── db.json           # Stores users, transaction history & budgets
│   ├── .env                  # Port and API key configuration
│   ├── database.js           # Decoupled Repository data layer (SHA-256 hashing)
│   ├── aiService.js          # Gemini REST API, Local Parser, Anomaly & Forecast Math
│   ├── server.js             # Express endpoints & requireAuth Scoping
│   └── package.json          
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Dashboard.jsx        # Grid Layout, metric orchestrator & session cache
    │   │   ├── Auth.jsx             # Login & SignUp tabbed cards
    │   │   ├── UserProfile.jsx      # Allowance range slider & email settings
    │   │   ├── AiLogger.jsx         # Text Logger & client-side OCR upload
    │   │   ├── TransactionForm.jsx  # Manual CRUD Form
    │   │   ├── TransactionList.jsx  # History Table with filters & pagination
    │   │   ├── AnalyticsCharts.jsx  # Custom SVG donut and progress meters
    │   │   └── InsightsPanel.jsx    # Anomaly notifications & forecast trend cards
    │   ├── App.jsx
    │   ├── App.css                  # Custom glassmorphic CSS styling
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js               # Port configuration & backend dev proxy
    └── package.json
```

---

## 🚀 Installation & Running (Unified Commands)

We have configured a root-level `package.json` to manage both client and server environments seamlessly.

### Prerequisites
*   Node.js (v18 or higher recommended)
*   npm

### Local Development (Quick Start)
1. **Install all dependencies** (root, backend, and frontend) in one command:
   ```bash
   npm run setup
   ```
2. **Start the development servers** concurrently (backend API on port 5000, Vite dev server on port 3000):
   ```bash
   npm run dev
   ```
3. Open **`http://localhost:3000`** in your browser.

---

## 🌐 Production Build & Hosting (Ready to Deploy)

To serve the app in a production-ready environment, the frontend is compiled into optimized static assets and served directly by the Express backend server on a unified port.

### Local Production Test
1. **Build and package the app**:
   ```bash
   npm run build
   ```
   *This command runs dependency installations and compiles Vite assets into `frontend/dist/`.*
2. **Start the unified server**:
   ```bash
   npm start
   ```
3. Open **`http://localhost:5000`** in your browser.

### Cloud Hosting Deployment (e.g., Render, Heroku, Railway)
You can deploy this repository directly as a single Node.js web service:
1. **Create a new Web Service** and connect it to this GitHub repository.
2. **Build Settings**:
   *   **Root Directory**: Leave blank (root of repository)
   *   **Build Command**: `npm run build`
   *   **Start Command**: `npm start`
3. **Environment Variables**:
   *   `PORT`: `5000` (or leave default, as it falls back to whatever the platform provides)
   *   `GEMINI_API_KEY`: *(Optional)* Your Google Gemini API key to activate high-fidelity LLM parsing for NLP text and OCR. If not provided, the app runs offline heuristic fallback parsing automatically.

