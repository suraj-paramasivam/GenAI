FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy static files
COPY index.html /usr/share/nginx/html/index.html
COPY index.css  /usr/share/nginx/html/index.css
COPY app.js     /usr/share/nginx/html/app.js

# Copy nginx config (listens on $PORT as required by Cloud Run)
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 8080

CMD ["/bin/sh", "-c", "envsubst '$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
