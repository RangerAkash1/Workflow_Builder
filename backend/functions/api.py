from mangum import Mangum
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.main import app

# Export handler for Netlify
handler = Mangum(app, lifespan="off")