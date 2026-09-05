@echo off
echo Starting ChronoGen Backend...
cd backend
start cmd /k "npm run dev"
echo Starting ChronoGen Frontend...
cd ..\frontend
start cmd /k "npm start"
echo Both servers starting. Backend: http://localhost:5001 | Frontend: http://localhost:3000
