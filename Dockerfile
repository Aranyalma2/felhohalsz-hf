# Base image
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package files from src/ (not root)
COPY src/package*.json ./

# Install dependencies
RUN yarn install

# Copy the rest of the source code into the container
COPY src/ .

# Expose the port your app runs on
EXPOSE 3000

# Start the application
CMD ["yarn", "start"]
