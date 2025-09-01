FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY next.config.js ./
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Install dependencies
RUN npm ci

# Copy source code
COPY pages ./pages
COPY components ./components
COPY contexts ./contexts
COPY hooks ./hooks
COPY styles ./styles
COPY public ./public

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
