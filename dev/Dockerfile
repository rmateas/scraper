FROM node:18 

EXPOSE 8080

# Install the latest Chrome dev package and necessary fonts and libraries
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] https://dl-ssl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf libxss1 dbus dbus-x11 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r pptruser && useradd -rm -g pptruser -G audio,video pptruser

# Determine the path of the installed Google Chrome
RUN which google-chrome-stable || true

# Set the working directory
WORKDIR /scraper

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Puppeteer without downloading bundled Chromium
RUN npm install && npm cache clean --force

# Copy your Puppeteer script into the Docker image
COPY . .

# Update the PUPPETEER_EXECUTABLE_PATH to the correct Chrome path (placeholder, update based on the output of `which google-chrome-stable`)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

#NAME: vinfo
# CMD [ "npm", "run", "vprod" ]
#docker build --no-cache -t crwebs.azurecr.io/scraper:v1.0-vinfo-061024 . && docker push crwebs.azurecr.io/scraper:v1.0-vinfo-061024

#NAME: cards
# CMD [ "npm", "run", "cards" ]
# docker build --no-cache -t crwebs.azurecr.io/scraper:v1.0-cards-061024b . && docker push crwebs.azurecr.io/scraper:v1.0-cards-061024b

#NAME: sinfo
#CMD [ "npm", "run", "sprod" ]
#docker build --no-cache -t crwebs.azurecr.io/scraper:v1.0-sinfo-052124 . && docker push crwebs.azurecr.io/scraper:v1.0-sinfo-052124

#NAME: pag
CMD [ "npm", "run", "pag" ]
#docker build --no-cache -t crwebs.azurecr.io/scraper:v1.0-pag-062024 . && docker push crwebs.azurecr.io/scraper:v1.0-pag-062024

# test image locally
# docker run -p 8080:8080 <tag_name>
# first port you can choose any port if that one is not available and second port is the port associated with the image.
# to run it localy use localhost:<first port> in this case localhost:80

#docker build --no-cache -t crwebs.azurecr.io/scraper:v1.0-052024 . && docker push crwebs.azurecr.io/scraper:v1.0-052024

# docker login crwebs.azurecr.io
# username: crwebs
# pass: Webscraping - Azure CR

# docker logout crwebs.azurecr.io