#!/bin/bash

echo "🎯 Building Shorts Analyzer for Hostinger Shared Hosting..."

# Build the static version
echo "📦 Building static export..."
npm run build

# Create Hostinger deployment folder
HOSTINGER_DIR="hostinger-upload"
echo "📁 Creating Hostinger upload package..."

# Remove old directory if exists
rm -rf $HOSTINGER_DIR

# Create directory
mkdir $HOSTINGER_DIR

# Copy the built static files
cp -r out/* $HOSTINGER_DIR/

# Create htaccess for proper routing
echo "RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [QSA,L]

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache static files
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css \"access plus 1 year\"
    ExpiresByType application/javascript \"access plus 1 year\"
    ExpiresByType image/png \"access plus 1 year\"
    ExpiresByType image/jpg \"access plus 1 year\"
    ExpiresByType image/jpeg \"access plus 1 year\"
    ExpiresByType image/gif \"access plus 1 year\"
    ExpiresByType image/svg+xml \"access plus 1 year\"
    ExpiresByType image/webp \"access plus 1 year\"
</IfModule>" > $HOSTINGER_DIR/.htaccess

echo "✅ Hostinger deployment package ready!"
echo ""
echo "📋 Upload Instructions:"
echo "1. Compress the '$HOSTINGER_DIR' folder into a ZIP file"
echo "2. Login to your Hostinger control panel"
echo "3. Go to File Manager"
echo "4. Navigate to public_html folder"
echo "5. Upload and extract the ZIP file"
echo "6. Your app will be live at your domain!"
echo ""
echo "🔧 Note: This static version has limited API functionality"
echo "💡 For full features, consider upgrading to Hostinger VPS"
