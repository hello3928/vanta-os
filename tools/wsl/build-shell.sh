#!/bin/bash
# Builds shell/ inside WSL. Target dir stays on the Linux disk; /mnt/c is slow.
set -e
cd /mnt/c/Users/Thomas/Documents/VantaOS/shell
export CARGO_TARGET_DIR=$HOME/vanta-target/shell
command -v qmake6 >/dev/null && export QMAKE=$(command -v qmake6)
cargo --version; rustc --version; ${QMAKE:-qmake} --version
cargo build "$@" 2>&1
