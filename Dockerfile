# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Build
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Instalar serve globalmente
RUN npm install -g serve

# Copiar apenas os arquivos buildados
COPY --from=builder /app/dist ./dist

# Porta - usar porta 80
EXPOSE 80

# Comando para rodar na porta 80
CMD ["serve", "-s", "dist", "-l", "80"]
