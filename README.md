# 📚 Library Management System (AWS Deployed)

A full-stack Library Management System backend built with Node.js, Express,
and PostgreSQL, designed to manage books, members, and borrowing transactions.
The application is deployed on AWS and exposes RESTful APIs for real-world usage.

## 🚀 Live Demo
🔗 https://<your-aws-live-url>

## ✨ Features
- Member management (add, view, delete)
- Book inventory management
- Borrow & return workflow
- Availability tracking for books
- Transaction history with joins
- Dashboard statistics API
- Recent activity feed
- Automatic database & table initialization

## 🛠 Tech Stack
- Backend: Node.js, Express.js
- Database: PostgreSQL
- Cloud: AWS (EC2 / Elastic Beanstalk)
- Tools: Git, GitHub, dotenv

## 📂 API Overview
- `POST /api/members`
- `GET /api/members`
- `POST /api/books`
- `GET /api/books`
- `POST /api/borrow`
- `POST /api/return`
- `GET /api/transactions`
- `GET /api/dashboard`
- `GET /api/recent-activity`

## ⚙️ Run Locally
```bash
git clone https://github.com/your-username/library_app.git
cd library_app
npm install
npm start
