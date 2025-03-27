FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build TypeScript code
RUN npm run build || (echo "Build failed, check if you have a build script in package.json" && exit 1)

# Expose the port the app runs on
EXPOSE 3006

# Command to run the application
CMD ["node", "dist/app.js"]
