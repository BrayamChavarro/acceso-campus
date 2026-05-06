#!/usr/bin/env bash
# Build script for Render deployment
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
mkdir -p media

# Create superuser from environment variables (only if it doesn't exist yet)
python manage.py shell << 'EOF'
import os
from django.contrib.auth.models import User

username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
email    = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@accesocampus.com')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', '')

if password and not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password)
    print(f"Superuser '{username}' created successfully.")
else:
    print(f"Superuser '{username}' already exists or no password set. Skipping.")
EOF
