FROM node:8

WORKDIR /var/www/html

COPY package*.json ./

RUN rm -rf node_modules

RUN npm install

RUN npm install -g nodemon

COPY . .

EXPOSE 3000

CMD ["npx", "nodemon", "index.js"]
