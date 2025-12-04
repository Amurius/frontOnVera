FROM node:22-alpine

WORKDIR /app

# Installer les dependances
COPY package*.json ./
RUN npm install

# Copier le code source
COPY . .

# Exposer le port de developpement Angular
EXPOSE 4200

# Lancer le serveur de developpement
CMD ["npm", "run", "start", "--", "--host", "0.0.0.0"]
