# FROM mongo:6.0.5-jammy
# the first line is for the online image
# the one below is for the local version
FROM galeri-database:latest

COPY ./mongod.conf /etc/
EXPOSE 27017
CMD ["mongod", "--config", "/etc/mongod.conf"]
