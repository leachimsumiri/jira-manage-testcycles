#!/bin/sh
pwd=$(pwd)
node ./node_modules/pkg/lib-es5/bin.js index.js --out-path $pwd/build -t node12-macos-x64
mv $pwd/build/index $pwd/build/macos_zephyr-clone-testcycles
node ./node_modules/pkg/lib-es5/bin.js index.js --out-path $pwd/build -t node12-win-x64
mv $pwd/build/index.exe $pwd/build/zephyr-clone-testcycles.exe
node ./node_modules/pkg/lib-es5/bin.js index.js --out-path $pwd/build -t node12-linux-x64
mv $pwd/build/index $pwd/build/linux_zephyr-clone-testcycles