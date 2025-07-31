#!/bin/bash

set -e

echo "Starting backend..."
(cd backend && ./mvnw spring-boot:run &)

echo "Starting frontend..."
(cd Sushruta_Frontend && ng serve &)

wait