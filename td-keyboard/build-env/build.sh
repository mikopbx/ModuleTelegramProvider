#!/bin/sh 

echo "Creating docker builder env"
builder="$(docker run -t -v "$(pwd)/..":/src -w /src -d build-env:2.1)"

echo "Getting dependencies...";
docker exec "$builder" go mod tidy
echo "Build started...";
docker exec "$builder" go build -o td-keyboard --ldflags '-extldflags "-static -L/usr/local/lib"';
echo "Build completed"

echo "Cleaning docker build env"
docker stop $builder
docker rm $builder