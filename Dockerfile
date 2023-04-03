# Use an official Node.js runtime as a parent image
FROM node:14

# Set the working directory to /app
WORKDIR /

# Copy the package.json and package-lock.json files to /app
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files to /app
COPY . .

# Set the container to listen on port 3000
EXPOSE 3000

# Run the command to start the server
CMD ["npm", "start"]

