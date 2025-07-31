@echo off
echo Starting backend...
start cmd /k "cd backend && mvnw spring-boot:run"

echo Starting frontend...
start cmd /k "cd Sushruta_Frontend && ng serve"


timeout /t 10 >nul
start http://localhost:4200