#!/bin/sh
set -e

# Default values if environment variables are not set
APP_BASE_URL=${APP_BASE_URL:-""}

# Create the config.js file with environment variables
mkdir -p /app/dist
cat > /app/dist/config.js << EOF
window.__APP_BASE_URL__ = "${APP_BASE_URL}";
EOF

echo "Config created successfully"
echo "Starting nginx..."

# Execute the main command
exec "$@"