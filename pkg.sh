#!/bin/sh
pwd=$(pwd)
node ./node_modules/pkg/lib-es5/bin.js index.js --out-path $pwd/build -t node8-linux-x64
mv $pwd/build/index $pwd/build/zephyr-execution-results