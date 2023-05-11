# FROM node:18.16.0-slim
# the first line is for the online image
# the one below is for the local version
FROM galeri-client:latest
ENV NODE_ENV production

# This might make my build less deterministic, but just to be safe
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends dumb-init

# Set the working directory to /app //actually to / root
WORKDIR /

# Copy the package.json and package-lock.json files to /app
COPY package*.json .

# Install dependencies
RUN npm install production

# Copy the rest of the application files to /app
COPY . .

# Give exec permissions for the script
RUN chmod +x /waitForIt.sh

# Set the container to listen on port 3000
EXPOSE 3000

# Run the command to start the server
CMD ["/bin/bash", "/waitForIt.sh", "-t", "60", "database:27017", "--", "dumb-init", "npm", "start"]



