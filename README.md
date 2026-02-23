# Smart Student Productivity AI (Campus Brain)

The mobile app now supports **both modes**:

1. `Server mode` (original behavior): backend auth + subject/attendance APIs.
2. `Device mode`: local `AsyncStorage` DB with mock fallback.

This keeps the original app workflow intact while adding the new attendance calculator and visual upgrades.

## What is implemented
- Login/register flow
- Subject creation and tracking
- Attendance screen:
  - add subjects
  - add lecture-wise record (`date + lecture + present/absent`)
  - attendance calculator
- Dashboard with subject-wise metrics and risk
- Pie chart for attendance percentages
- Dynamic attendance color gradients (low red -> high green/cyan)
- Cyberpunk animated UI (dark theme, radiation lines, rotating skull)

## Attendance formulas
- Percentage: `attended / total * 100`
- Max miss before threshold:
  - `floor(attended / (required/100) - total)`
- Classes needed to recover:
  - `ceil(((required/100) * total - attended) / (1 - required/100))`

## Run backend (for Server mode)
1. `cd backend`
2. `copy .env.example .env`
3. set `MONGO_URI` and `JWT_SECRET`
4. `npm install`
5. `npm run dev`

## Run mobile
1. `cd mobile`
2. `copy .env.example .env`
3. `npm install`
4. `npm start`

Default server API URL in mobile env:
- `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5000/api`

## Device mode mock login
- Email: `demo@campusbrain.ai`
- Password: `demo123`

## Local storage key
- `campus_brain_local_db_v1`

