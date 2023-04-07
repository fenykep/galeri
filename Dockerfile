# Use an official Node.js runtime as a parent image
# Ezt majd updateld a packagejasonben lévő számra, vagy a mai lts-re
FROM node:lts

# Set the working directory to /app //actually to / root
WORKDIR /

# Copy the package.json and package-lock.json files to /app
COPY package*.json .

# Install dependencies
RUN npm install

# Copy the rest of the application files to /app
COPY . .

# Set the container to listen on port 3000
EXPOSE 3000

# Run the command to start the server
CMD ["npm", "start"]

