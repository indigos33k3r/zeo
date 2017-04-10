#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

pushd "$DIR"/../;
# npm start -- site home port=443 &
npm start -- hub dns \
  port=8000 dnsPort=53 \
  homeHost=my.zeovr.io hubUrl=hub.zeovr.io:8000 \
  cryptoDirectorySrc='defaults/crypto' &
sleep infinity;
popd;
