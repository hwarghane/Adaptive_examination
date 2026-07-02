# AdaptExam — Online Adaptive Examination System

A full-stack MERN platform for schools, colleges, and universities worldwide.  
Anyone can register and use it — no IT setup, no institutional restrictions.

---

## Features

### Authentication
- Separate registration and login for **Teachers** and **Students**
- Role-based JWT authentication (7-day tokens)
- Secure bcrypt password hashing (cost factor 10)

### Student Profile
Name · Email · College/University · Branch · Year · Semester · Roll Number

### Teacher Profile
Name · Email · Institution · Department

### Class Management
- Teachers create unlimited classes
- Every class gets a unique **8-character join code** + **QR code** + **invite link**
- Students join by entering the code or scanning the QR code
- One student can join multiple classes from different institutions
- Teachers can remove students from a class

### Question Bank
- MCQ questions tagged with **Bloom's Taxonomy level** (Remember → Create)
- **Difficulty factor** 1–10 per question
- Optional explanation and image per question
- Filter by Bloom level, difficulty, or subject

### Adaptive Examination Engine
- Starts at Bloom: *Remember*, Difficulty: *5*
- **Correct answer** → difficulty +1 (max 10)
- **Wrong answer** → difficulty −1 (min 1)
- **Bloom level advances** when difficulty > 7 AND accuracy ≥ 70% for current level
- Tracks score, time per question, Bloom progression, and answer history
- Auto-submits when time expires

### Analytics
- **Teacher**: class-wise stats, Bloom distribution, score distribution, individual student reports, exam analytics
- **Student**: score trend, Bloom radar, strengths/weaknesses, recommendations, full exam history

### Notifications
- Auto-notified when an exam is assigned to a class
- Mark individual or all notifications as read
- Unread badge in navigation

---

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Backend  | Node.js, Express.js, Mongoose (MongoDB) |
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Auth     | JWT + bcryptjs |
| QR Code  | `qrcode` npm package |
| Icons    | Lucide React |
| Toasts   | react-hot-toast |

---

## Running the Project

### Prerequisites
- Node.js 18+
- MongoDB (local on port 27017, or change MONGO_URI in .env)

### 1. Start the Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on **http://localhost:5000**

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**

### 3. Open in browser

Navigate to **http://localhost:5173**

---

## Quick Start Workflow

1. **Register as Teacher** → create a class → copy the join code
2. **Register as Student** → enter the join code → join the class
3. **Teacher** → add questions to Question Bank (set Bloom level + difficulty)
4. **Teacher** → create an exam → assign to the class → publish
5. **Student** → goes to Exams tab → takes the adaptive exam
6. Both see analytics immediately after completion

---

## API Endpoints

| Route | Description |
|-------|-------------|
| `POST /api/auth/register/student` | Student registration |
| `POST /api/auth/register/teacher` | Teacher registration |
| `POST /api/auth/login` | Login (both roles) |
| `GET /api/classes/my` | Teacher's classes |
| `POST /api/classes` | Create class |
| `POST /api/classes/join` | Student joins class |
| `GET /api/classes/enrolled/me` | Student's enrolled classes |
| `GET /api/questions/my` | Teacher's questions |
| `POST /api/questions` | Add question |
| `POST /api/exams` | Create exam |
| `GET /api/exams/student/available` | Student's assigned exams |
| `POST /api/attempts/start/:examId` | Start adaptive exam |
| `POST /api/attempts/answer/:attemptId` | Submit answer + get next question |
| `POST /api/attempts/submit/:attemptId` | Force submit |
| `GET /api/attempts/result/:attemptId` | View detailed result |
| `GET /api/analytics/teacher/dashboard` | Teacher overview stats |
| `GET /api/analytics/student/dashboard` | Student overview stats |
| `GET /api/notifications` | Get notifications |

---

## Environment Variables (backend/.env)

```
MONGO_URI=mongodb://localhost:27017/adaptive_exam
JWT_SECRET=your_secret_key_here
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```
