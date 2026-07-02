# Quick Setup Guide

## 1. Prerequisites
- **Node.js** >= 18 — https://nodejs.org
- **MongoDB** running locally on port 27017
  - Download: https://www.mongodb.com/try/download/community
  - Or use MongoDB Atlas (free cloud): https://cloud.mongodb.com

## 2. Configure Environment
The `.env` file is already created in `backend/.env` with default values:
```
MONGO_URI=mongodb://localhost:27017/adaptive_quiz
JWT_SECRET=adaptive_quiz_secret_key_2024
PORT=5000
```
If using Atlas, replace `MONGO_URI` with your Atlas connection string.

## 3. Seed the Database
```bash
cd backend
node seed.js
```
This creates sample users and 8 questions (one per Bloom's level).

## 4. Start the Backend
```bash
cd backend
npm run dev
```
Server runs on: http://localhost:5000

## 5. Start the Frontend
Open a new terminal:
```bash
cd frontend
npm run dev
```
App runs on: http://localhost:5173

## 6. Login
Open http://localhost:5173 in your browser.

| Role    | Username  | Password    |
|---------|-----------|-------------|
| Teacher | teacher   | teacher123  |
| Student | student1  | student123  |
| Student | student2  | student123  |

## 7. TinyMCE API Key
The app uses the API key from the original project. To use your own:
1. Sign up at https://www.tiny.cloud/
2. Get a free API key
3. Replace `54qu01ccabm8balfurt74pvbtejodrl7ysd7l8g4wdo2rtnf` in:
   - `frontend/src/pages/teacher/AddQuestion.jsx`
   - `frontend/src/pages/teacher/EditQuestions.jsx`
