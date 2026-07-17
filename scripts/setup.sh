#!/bin/bash
# Local development setup script for TenantPlus Backend

set -e

echo "Starting TenantPlus Backend Setup..."

# 1. Create a virtual environment
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment '.venv'..."
    python -m venv .venv
else
    echo "Virtual environment '.venv' already exists."
fi

# 2. Activate the virtual environment
echo "Activating virtual environment..."
# Cross-platform activation for bash-like environments (Git Bash, etc.)
if [ -f ".venv/Scripts/activate" ]; then
    source .venv/Scripts/activate
elif [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
else
    echo "Failed to find activation script."
    exit 1
fi

# 3. Install requirements
echo "Installing dependencies from backend/requirements.txt..."
pip install --upgrade pip
pip install -r backend/requirements.txt

# 4. Run migrations
echo "Running database migrations..."
python manage.py migrate

echo "Setup complete!"
echo "To start the development server, run:"
echo "source .venv/Scripts/activate  # (or .venv/bin/activate on Linux/Mac)"
echo "python manage.py runserver"
