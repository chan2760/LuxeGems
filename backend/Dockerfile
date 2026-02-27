FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && mkdir -p public/uploads/products public/uploads/designs
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
