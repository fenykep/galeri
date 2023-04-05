FROM mongo:latest
WORKDIR /usr/src/app
RUN mkdir -p /data/db
COPY ./mongod.conf /etc/
EXPOSE 27017
CMD ["mongod", "--config", "/etc/mongod.conf"]

