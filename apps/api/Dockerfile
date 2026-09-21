FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm install
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev", "-w", "apps/api"]
