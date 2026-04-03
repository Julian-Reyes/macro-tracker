FROM node:20-slim

WORKDIR /app

# Install frontend deps and build
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src/ src/
RUN npm run build

# Install backend deps
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci
COPY server/ server/

# Generate Prisma client
RUN cd server && npx prisma generate

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

CMD cd server && npx prisma db push --skip-generate && cd /app && node server/src/index.js
