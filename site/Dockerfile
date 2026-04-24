FROM nginx:1.27-alpine

# Copy static site
COPY . /usr/share/nginx/html
# Remove the Dockerfile itself from the served directory
RUN rm -f /usr/share/nginx/html/Dockerfile /usr/share/nginx/html/.dockerignore

# Config: serve on 8080, SPA-friendly fallback, gzip, cache immutable assets
RUN cat <<'EOF' > /etc/nginx/conf.d/default.conf
server {
  listen 8080 default_server;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  gzip on;
  gzip_types text/plain text/css application/javascript application/json image/svg+xml;
  gzip_min_length 256;

  # Cache images and fonts aggressively
  location ~* \.(png|jpg|jpeg|gif|webp|svg|ico|woff2?)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;
  }

  # HTML: no cache so updates land fast
  location / {
    add_header Cache-Control "no-cache, must-revalidate";
    try_files $uri $uri/ /index.html;
  }

  # Security headers
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
}
EOF

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost:8080 || exit 1
