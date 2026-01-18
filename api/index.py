from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
import sys
import os

# Add the backend app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.app.main import app as fastapi_app

# CORS is already configured in main.py 
# Export the handler for Vercel Serverless
handler = Mangum(fastapi_app, lifespan="off")
