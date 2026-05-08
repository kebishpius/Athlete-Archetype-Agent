# Build stage
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Hardcode the backend URL so Vite bakes it into the bundle at build time
ENV VITE_API_URL=https://athlete-archetype-agent-602402744184.us-central1.run.app
RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Cloud Run requires port 8080 - patch nginx default config at startup
EXPOSE 8080
CMD sed -i 's/listen       80;/listen       8080;/' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'
