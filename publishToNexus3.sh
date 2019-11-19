#!/bin/sh

if [ $# -eq 0 ]; then
  # Read Nexus3 Username
  echo -n "Nexus3 username: " 
  read username
  # Read Nexus3 Password
  echo -n "Nexus3 password: "
  stty -echo
  printf "Password: "
  read password
  stty echo
  printf "\n"
  echo
else
  username=$1
  password=$2
fi
version=$(jq -a -r '.version' package.json | sed 's/"//g')
url="http://nexus3.evva.com:8081/nexus/repository/evva-artifacts/zephyr-execution-results/$version/zephyr-execution-results"

if curl --output /dev/null --silent --head --fail "$url"; then
  printf "\nVersion $version already exists on nexus!\n$url\nDelete it manually and try uploading again.\n"
  exit 1
fi
printf "Version:$version\n"
curl -v -u $username:$password $url -X PUT --data-binary "@build/zephyr-execution-results" -H 'User-Agent: Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:70.0) Gecko/20100101 Firefox/70.0' -H 'Accept: */*' -H 'Accept-Language: en-US,en;q=0.5' --compressed -H 'Content-Type: ' -H 'X-Requested-With: XMLHttpRequest' -H 'Origin: http://nexus3.evva.com:8081' -H 'DNT: 1' -H 'Connection: keep-alive' -H 'Referer: http://nexus3.evva.com:8081/nexus/repository/evva-artifacts/uploader'