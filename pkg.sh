#!/bin/sh
pwd=$(pwd)
node ./node_modules/pkg/lib-es5/bin.js index.js --out-path $pwd -t node12-macos-x64
