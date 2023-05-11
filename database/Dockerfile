FROM mongo:6.0.5-jammy
COPY ./mongod.conf /etc/
EXPOSE 27017
CMD ["mongod", "--config", "/etc/mongod.conf"]
