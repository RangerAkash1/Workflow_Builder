# Workflow Builder Application

A powerful visual workflow builder with RAG (Retrieval Augmented Generation) capabilities, featuring drag-and-drop components, knowledge base integration, and LLM-powered chat interfaces.

## 🌟 Features

### Core Features
- **Visual Workflow Builder** - Drag-and-drop interface using React Flow
- **RAG Pipeline** - Knowledge base integration with vector embeddings
- **Multi-LLM Support** - OpenAI GPT-4o and Google Gemini
- **Document Processing** - PDF upload and chunking
- **Web Search Integration** - SerpAPI for enhanced context
- **Real-time Chat Interface** - Interactive conversation with workflows
- **Workflow Persistence** - Save and load workflows from PostgreSQL

### Optional Features ✅
- **User Authentication** - JWT-based login/register system
- **Execution Logs** - Track workflow runs with timing and error details
- **Chat History** - Persistent conversation history
- **User Data Isolation** - Personal workflows, documents, and logs

## 📋 Prerequisites

### Required
- **Python 3.11+** - Backend runtime
- **Node.js 18+** - Frontend build tools
- **PostgreSQL 15+** - Database for persistence
- **Docker & Docker Compose** (optional) - For containerized deployment

### API Keys (At least one required)
- **OpenAI API Key** - For GPT models and embeddings
- **Google Gemini API Key** - For Gemini models
- **SerpAPI Key** (optional) - For web search functionality

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Round-1_AI_Planet
```

### 2. Setup PostgreSQL Database

#### Option A: Using Docker
```bash
docker run --name workflow-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_USER=workflow_user \
  -e POSTGRES_DB=workflow_db \
  -p 5432:5432 \
  -d postgres:15
```

#### Option B: Local PostgreSQL
Create a database manually:
```sql
CREATE DATABASE workflow_db;
CREATE USER workflow_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE workflow_db TO workflow_user;
```

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (see Configuration section below)
# Copy the example and edit:
cp .env.example .env
# Edit .env with your settings
```

### 4. Frontend Setup

```bash
# Open new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file (optional)
# For custom API base URL:
echo "VITE_API_BASE=http://localhost:8000" > .env
```

### 5. Run the Application

#### Terminal 1 - Backend
```bash
cd backend
# Activate venv if not already active
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: http://localhost:8000
API Documentation: http://localhost:8000/docs

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

Frontend will be available at: http://localhost:5173

### 6. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## ⚙️ Configuration

### Backend Configuration (.env)

Create a `backend/.env` file with the following variables:

```bash
# Database Configuration (REQUIRED)
DATABASE_URL=postgresql://workflow_user:yourpassword@localhost:5432/workflow_db

# LLM Provider API Keys (At least one REQUIRED)
OPENAI_API_KEY=sk-your-openai-key-here
GEMINI_API_KEY=your-gemini-key-here

# Optional: Web Search
SERPAPI_KEY=your-serpapi-key-here

# Optional: Authentication (for multi-user support)
SECRET_KEY=your-secret-jwt-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_DAYS=7

# Optional: Storage Configuration
CHROMA_PATH=.chroma

# Optional: CORS Configuration
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# Optional: Rate Limiting
RATE_LIMIT_ENABLED=true
THROTTLE_ENABLED=true
```

#### Generate Secure SECRET_KEY
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Frontend Configuration (.env)

Create a `frontend/.env` file (optional):

```bash
# API Base URL (defaults to http://localhost:8000)
VITE_API_BASE=http://localhost:8000
```

## 📖 Usage Guide

### 1. Building a Workflow

1. **Add Components** - Click component buttons in the left panel:
   - **User Query** - Input node for user questions
   - **Knowledge Base** - RAG retrieval from uploaded documents
   - **LLM Engine** - AI model for generating responses
   - **Output** - Final response display

2. **Connect Nodes** - Drag from one node's handle to another to create connections

3. **Configure Nodes** - Click a node to open the configuration panel:
   - **Knowledge Base**: Select collection, set top-k results
   - **LLM Engine**: Choose provider (OpenAI/Gemini), model, enable web search
   - **Output**: Customize response formatting

4. **Save Workflow** - Click "Manage" → "Save Workflow" (requires authentication for user-specific workflows)

### 2. Uploading Knowledge Base Documents

1. Click on **Knowledge Base** node to configure
2. Click **"Upload PDF"** in the configuration panel
3. Select collection name (or use "default")
4. Choose a PDF file
5. Wait for processing (chunking and embedding)

### 3. Running a Workflow

1. Click **"Build & Validate"** to check workflow structure
2. If validation passes, the chat panel opens automatically
3. Type your question in the chat input
4. Click **Send** or press Enter
5. View the AI-generated response with context

### 4. Authentication (Optional)

**To use user-specific features:**
1. Click **"Login"** or **"Register"** in the auth panel
2. Create an account with username, email, and password
3. Or click **"Continue without login"** for anonymous mode

**Authenticated benefits:**
- Personal workflows
- Private document collections
- Personal chat history
- Execution logs

### 5. Viewing Execution Logs

1. Click **"Show Logs"** button in the header (when authenticated)
2. Filter logs by status: All, Success, Error, Timeout
3. View execution details:
   - Execution time in milliseconds
   - Provider used
   - Context chunks retrieved
   - Error messages (if failed)
4. Click **"Hide Logs"** to return to workflow builder

## 🐳 Docker Deployment

### Using Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **PostgreSQL**: localhost:5432

### Building Individual Images

```bash
# Backend
cd backend
docker build -t workflow-backend .

# Frontend
cd frontend
docker build -t workflow-frontend .
```

## ☸️ Kubernetes Deployment

### Using kubectl (Kubernetes Manifests)

```bash
# Apply all manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n workflow-app

# Access services
kubectl port-forward -n workflow-app svc/frontend 3000:80
kubectl port-forward -n workflow-app svc/backend 8000:8000
```

### Using Helm

```bash
# Install the chart
helm install workflow-app ./helm/workflow-app

# Upgrade
helm upgrade workflow-app ./helm/workflow-app

# Uninstall
helm uninstall workflow-app
```

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for detailed Kubernetes deployment instructions.

## 📚 API Documentation

### Interactive API Docs

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/me` - Get current user info

#### Workflows
- `POST /workflow/save` - Save workflow
- `GET /workflows` - List all workflows
- `GET /workflow/{uuid}` - Get workflow by ID
- `POST /workflow/{uuid}/update` - Update workflow
- `DELETE /workflow/{uuid}` - Delete workflow
- `POST /workflow/validate` - Validate workflow structure

#### Knowledge Base
- `POST /knowledge/upload` - Upload PDF document
- `GET /knowledge/collections` - List available collections
- `GET /documents` - List uploaded documents

#### Chat & Execution
- `POST /chat/run` - Execute workflow with user query
- `GET /chat/history` - Get chat history
- `GET /execution/logs` - Get execution logs

#### Health
- `GET /health` - Health check endpoint

### Authentication

Include JWT token in requests:
```bash
curl -H "Authorization: Bearer <your-token>" \
  http://localhost:8000/workflows
```

## 🏗️ Project Structure

```
Round-1_AI_Planet/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py            # FastAPI application
│   │   ├── auth.py            # Authentication utilities
│   │   ├── database.py        # Database operations
│   │   └── config.py          # Configuration settings
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile            # Backend container image
│   └── .env                  # Configuration (create this)
│
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── App.jsx           # Main application
│   │   ├── components/       # React components
│   │   │   ├── AuthPanel.jsx
│   │   │   ├── ChatPanel.jsx
│   │   │   ├── ConfigPanel.jsx
│   │   │   ├── ExecutionLogs.jsx
│   │   │   ├── WorkflowCanvas.jsx
│   │   │   └── WorkflowManager.jsx
│   │   └── style.css         # Styling
│   ├── package.json          # Node dependencies
│   ├── Dockerfile           # Frontend container image
│   └── .env                 # Configuration (optional)
│
├── k8s/                      # Kubernetes manifests
│   ├── namespace.yaml
│   ├── postgres-deployment.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   └── ingress.yaml
│
├── helm/                     # Helm charts
│   └── workflow-app/
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
│
├── docker-compose.yml        # Docker Compose configuration
│
└── docs/                     # Documentation
    ├── OPTIONAL-FEATURES.md
    ├── DEPLOYMENT.md
    └── QUICKSTART-OPTIONAL.md
```

## 🔧 Development

### Backend Development

```bash
cd backend

# Install dev dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest

# Format code
black app/

# Lint code
flake8 app/

# Type checking
mypy app/
```

### Frontend Development

```bash
cd frontend

# Run dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Database Migrations

The application automatically creates database tables on startup. To manually manage the schema:

```bash
# Connect to database
psql -U workflow_user -d workflow_db

# View tables
\dt

# View table schema
\d workflows
\d users
\d execution_logs
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v --cov=app
```

### Frontend Tests

```bash
cd frontend
npm test
```

### API Testing with curl

```bash
# Health check
curl http://localhost:8000/health

# Register user
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"test123"}'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'

# List workflows (with token)
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/workflows
```

## 🐛 Troubleshooting

### Common Issues

#### Backend won't start
```bash
# Check Python version
python --version  # Should be 3.11+

# Check if port 8000 is in use
# Windows:
netstat -ano | findstr :8000
# Linux/Mac:
lsof -i :8000

# Check database connection
psql -U workflow_user -d workflow_db -c "SELECT 1"
```

#### Frontend won't start
```bash
# Check Node version
node --version  # Should be 18+

# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check if port 5173 is in use
# Windows:
netstat -ano | findstr :5173
# Linux/Mac:
lsof -i :5173
```

#### Database connection errors
- Verify DATABASE_URL in `.env`
- Check PostgreSQL is running: `pg_isready`
- Verify database exists: `psql -l`
- Check user permissions

#### Authentication errors (401)
- Token expired → Login again
- SECRET_KEY mismatch → Check .env file
- Clear browser localStorage and login again

#### Upload/Embedding errors
- Verify API keys in `.env`
- Check file format (PDF only)
- Ensure sufficient disk space for .chroma directory

### Debug Mode

Enable debug logging:

```bash
# Backend
LOG_LEVEL=DEBUG python -m uvicorn app.main:app --reload

# Frontend
npm run dev -- --debug
```

### Logs

```bash
# View backend logs
tail -f backend.log

# Docker Compose logs
docker-compose logs -f backend

# Kubernetes logs
kubectl logs -f deployment/backend -n workflow-app
```

## 📊 Monitoring

See [`monitoring/README.md`](./monitoring/README.md) for:
- Prometheus metrics
- Grafana dashboards
- ELK Stack logging
- Performance monitoring

## 🔒 Security

### Production Security Checklist

- [ ] Change `SECRET_KEY` to a secure random value
- [ ] Use HTTPS/TLS for all connections
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting
- [ ] Use strong database passwords
- [ ] Rotate API keys regularly
- [ ] Enable firewall rules
- [ ] Regular security updates
- [ ] Backup database regularly
- [ ] Monitor logs for suspicious activity

### Environment Variables Security

**Never commit `.env` files to version control!**

```bash
# Add to .gitignore
echo "*.env" >> .gitignore
echo ".env.*" >> .gitignore
```

## 📄 License

[Add your license here]

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- **Documentation**: See [`docs/`](./docs/) directory
- **Issues**: Open an issue on GitHub
- **API Docs**: http://localhost:8000/docs (when running)

## 🎯 Roadmap

### Completed ✅
- [x] Visual workflow builder
- [x] RAG pipeline implementation
- [x] Multi-LLM support
- [x] Workflow persistence
- [x] User authentication
- [x] Execution logs
- [x] Chat history
- [x] Docker deployment
- [x] Kubernetes deployment

### Planned 🚧
- [ ] Password reset functionality
- [ ] OAuth/SSO integration
- [ ] Role-based access control
- [ ] Workflow sharing between users
- [ ] Real-time collaboration
- [ ] Advanced analytics
- [ ] Export/Import workflows
- [ ] API rate plans

## 🌐 Deployment Guides

- **Docker Compose**: See [`README-DOCKER.md`](./README-DOCKER.md)
- **Kubernetes**: See [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- **Helm Charts**: See [`helm/HELM-GUIDE.md`](./helm/HELM-GUIDE.md)
- **Optional Features**: See [`OPTIONAL-FEATURES.md`](./OPTIONAL-FEATURES.md)

## 📈 Performance

- **Backend**: FastAPI async performance
- **Frontend**: Vite build optimization
- **Database**: PostgreSQL with indexes
- **Caching**: Redis-ready architecture
- **Rate Limiting**: SlowAPI integration

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI 0.115+
- **Language**: Python 3.11+
- **Database**: PostgreSQL 15+ with asyncpg
- **Vector Store**: ChromaDB
- **Authentication**: JWT (python-jose)
- **Security**: Passlib (bcrypt)

### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite
- **Workflow**: React Flow
- **HTTP Client**: Axios
- **Styling**: CSS3

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **Package Manager**: Helm
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack

---

**Version**: 1.0.0 | **Last Updated**: January 16, 2026

Made with ❤️ for building intelligent workflows
