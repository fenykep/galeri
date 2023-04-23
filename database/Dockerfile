FROM mongo:latest
COPY ./mongod.conf /etc/
EXPOSE 27017
CMD ["mongod", "--config", "/etc/mongod.conf"]
