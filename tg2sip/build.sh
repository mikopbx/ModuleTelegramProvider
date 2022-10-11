#!/bin/sh 

echo "Creating docker builder env"
builder="$(docker run -t -v "$(pwd)":/src -w /src -d build-env:2.1)"

echo "Getting dependencies...";
docker exec "$builder" cmake -DCMAKE_BUILD_TYPE=Release .
echo "Build started...";
docker exec "$builder" cmake --build .;
echo "Build completed"

echo "Cleaning docker build env"
docker stop $builder
docker rm $builder