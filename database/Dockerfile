FROM mysql:8.0

ENV MYSQL_DATABASE=restaurant_gacha

# Copy initialization script
COPY schema.sql /docker-entrypoint-initdb.d/
