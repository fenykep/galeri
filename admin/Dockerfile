FROM node:18.16.0-slim
ENV NODE_ENV production

# This might make my build less deterministic, but just to be safe
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends dumb-init

# Set the working directory to /app //actually to / root
WORKDIR /

# Copy the package.json and package-lock.json files to WORKingDIRectory
COPY package*.json .

# Install dependencies
RUN npm install production

# Copy the rest of the application files to /app
COPY . .

# Set the container to listen on port 3000
EXPOSE 3000

# Run the command to start the server
CMD ["dumb-init", "npm", "start"]

