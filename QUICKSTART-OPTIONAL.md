# Quick Start - Optional Features

## TL;DR - What's New?

✅ **User Authentication** - JWT-based login/register
✅ **Execution Logs** - Track all workflow runs with timing and errors
✅ **Enhanced Workflow Saving** - Now linked to users
✅ **Enhanced Chat History** - User-specific filtering

## Setup (5 minutes)

### 1. Install New Dependencies
```bash
cd backend
pip install python-jose[cryptography] passlib[bcrypt]
```

### 2. Configure Environment
Add to `.env`:
```bash
SECRET_KEY=your-secret-key-here-change-in-production
```

Generate a secure key:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. Start the Application
```bash
# Backend
cd backend
python -m uvicorn app.main:app --reload

# Frontend
cd frontend
npm run dev
```

Database tables are created automatically!

## Usage

### Authentication (Optional)

1. **Register** - Click "Register" in the auth panel
2. **Login** - Use your credentials
3. **Skip** - Click "Continue without login" for anonymous mode

### Execution Logs

1. Click **"Show Logs"** button in the header
2. Filter by status (all/success/error/timeout)
3. View detailed execution info, timing, and errors
4. Click **"Hide Logs"** to return to workflow builder

### User-Specific Data

When authenticated:
- **Workflows** - Only see your workflows
- **Documents** - Only see your uploaded documents
- **Chat History** - Only see your conversations
- **Execution Logs** - Only see your executions

When not authenticated:
- All data is public and shared

## API Examples

### Register
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"secure123"}'
```

### Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"secure123"}'
```

### Use Token
```bash
TOKEN="your-token-here"
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/auth/me
```

### View Execution Logs
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/execution/logs
```

### Filter Logs by Status
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/execution/logs?status=error&limit=10"
```

## Features at a Glance

| Feature | Endpoint | Authentication |
|---------|----------|----------------|
| Register | `POST /auth/register` | No |
| Login | `POST /auth/login` | No |
| Get Profile | `GET /auth/me` | Required |
| Execution Logs | `GET /execution/logs` | Optional |
| Save Workflow | `POST /workflow/save` | Optional |
| List Workflows | `GET /workflows` | Optional |
| Chat History | `GET /chat/history` | Optional |
| Upload Document | `POST /knowledge/upload` | Optional |

## Database Tables

New tables created automatically:
- `users` - User accounts
- `execution_logs` - Execution tracking

Updated tables:
- `workflows` - Added `user_id` column
- `chat_logs` - Added `user_id` column
- `documents` - Added `user_id` column

## Troubleshooting

### Issue: 401 Unauthorized
**Solution**: Token expired or invalid. Log in again.

### Issue: Database errors
**Solution**: Check `DATABASE_URL` in `.env` and ensure PostgreSQL is running.

### Issue: Password hash errors
**Solution**: Install bcrypt: `pip install bcrypt`

### Issue: Token not working
**Solution**: Verify `SECRET_KEY` is set and matches across restarts.

## Security Notes

⚠️ **IMPORTANT**: 
- Change `SECRET_KEY` in production!
- Use HTTPS in production
- Tokens expire after 7 days (configurable)

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure `.env`
3. ✅ Start application
4. ✅ Register a user (or skip)
5. ✅ Build and run workflows
6. ✅ View execution logs

## File Changes Summary

**Backend:**
- `backend/app/auth.py` - New authentication module
- `backend/app/database.py` - Updated with auth and logs
- `backend/app/main.py` - New auth endpoints
- `backend/app/config.py` - JWT settings
- `backend/requirements.txt` - New dependencies

**Frontend:**
- `frontend/src/components/AuthPanel.jsx` - New
- `frontend/src/components/ExecutionLogs.jsx` - New
- `frontend/src/App.jsx` - Updated with auth state
- `frontend/src/style.css` - New styles

**Documentation:**
- `OPTIONAL-FEATURES.md` - Complete guide
- `CHANGELOG-OPTIONAL-FEATURES.md` - Version history
- `QUICKSTART-OPTIONAL.md` - This file

## Support

📖 **Full Documentation**: See `OPTIONAL-FEATURES.md`
📝 **Changelog**: See `CHANGELOG-OPTIONAL-FEATURES.md`
🔍 **API Docs**: http://localhost:8000/docs (when running)

---

**Version**: 1.0.0 | **Date**: 2026-01-16 | **Status**: ✅ Production Ready
