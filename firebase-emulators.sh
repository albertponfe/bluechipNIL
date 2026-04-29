#!/bin/bash
# Runs firebase through cmd.exe so child processes (Functions emulator) can find node and java

ARGS="$@"

cmd.exe /c "SET PATH=C:\\Program Files\\nodejs;C:\\Program Files\\Java\\jdk-26.0.1\\bin;C:\\Users\\alber\\AppData\\Roaming\\npm;%PATH% && node C:\\Users\\alber\\AppData\\Roaming\\npm\\node_modules\\firebase-tools\\lib\\bin\\firebase.js $ARGS"
