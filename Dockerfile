# Use Node 20 (Coolify uses Node 20.x internally)
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install dependencies, including ws
RUN npm install --production

# Copy the rest of the app
COPY . .

# Expose port (if your Express server listens on 3000)
EXPOSE 3000

# Start the importer
CMD ["npm", "start"]

