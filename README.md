# Foodie-AI 🥗🤖

**Foodie AI** is an intelligent health and nutrition coaching platform that leverages machine learning and Generative AI to provide personalized 7-day meal plans, dynamic recipe generation, dietary deficiency recovery analysis, automated meal replanning, workout guidance with video demonstrations, and conversational AI coaching.

---

## 🌟 Key Features

- **Personalized 7-Day Meal Planning**: Tailored to metabolic targets (BMR & TDEE), diet preferences (vegetarian, vegan, non-vegetarian), allergens/exclusions, and realistic portion caps (50g–400g).
- **Dynamic Replanning Engine**: Automatically recalculates remaining meals if prior meals vary from plan targets.
- **Symptom & Deficiency Recovery**: AI-driven authentic Indian dietary strategies mapped to health symptoms (hair fall, fatigue, bone pain, etc.).
- **Interactive Daily Tracker**: Track meal time slots (breakfast, lunch, snack, dinner), log custom foods with AI calorie estimation, and monitor daily hydration.
- **Goal-Driven Workout Coaching**: Routines categorized by fitness goals (*fat loss, muscle gain, maintenance, cutting, bulking*) and gender with bundled video demos.
- **AI Health Advisor**: Conversational nutritional coach with clinical prompt cards for real-time guidance.
- **PDF Export**: Generate branded PDF reports of weekly meal plans and daily tracker metrics.
- **User Authentication & History**: Secure password hashing, saved past plans, and profile management with PostgreSQL.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, React Router v7, FontAwesome, jsPDF, Three.js
- **Backend**: Python 3.10+, Flask, Flask-SQLAlchemy, Flask-CORS, Gunicorn
- **Database**: PostgreSQL
- **Machine Learning & AI**: Scikit-Learn (Cosine Similarity), Google GenAI SDK (Gemini API)
- **Deployment**: GitHub Pages (Frontend), Render / Railway (Backend & Database)

---

## 🚀 Local Development Setup

### 1. Backend Setup (Flask & PostgreSQL)

```bash
# Navigate to nutri folder
cd nutri

# Install dependencies
pip install -r requirements.txt

# Create .env file with your credentials:
# GEMINI_API_KEY=your_gemini_api_key
# DATABASE_URL=postgresql://user:password@localhost:5432/foodie_db
# SMTP_USER=your_email@gmail.com
# SMTP_PASSWORD=your_email_app_password

# Run the Flask server
python app.py
```
Backend runs by default on `http://localhost:5000`.

### 2. Frontend Setup (React & Vite)

```bash
# Navigate to myapp folder
cd myapp

# Install npm dependencies
npm install

# Start development server
npm run dev
```
Frontend runs by default on `http://localhost:3000`.

---

## 🌐 Deployment

### Frontend (GitHub Pages)
A GitHub Actions workflow (`.github/workflows/deploy.yml`) is included. Once pushed to the `main` branch:
1. In your GitHub repository, navigate to **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. The workflow will automatically build and publish the frontend at:  
   `https://<username>.github.io/Foodie-AI/`

### Backend (Render / Railway)
1. Link this GitHub repository to [Render](https://render.com) or [Railway](https://railway.app).
2. Use the included `render.yaml` or set:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --chdir nutri app:app`
   - **Environment Variables**:
     - `DATABASE_URL`: Connection string to PostgreSQL
     - `GEMINI_API_KEY`: Google Gemini API Key
3. Set `VITE_API_URL` in the frontend build or repository secrets to your deployed backend URL.
