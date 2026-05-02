FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --production

# Copy application files
COPY . .

EXPOSE 8080

CMD ["node", "server.js"]
