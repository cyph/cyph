@echo off

set dir=%cd%
cd %~dp0

git pull
cacls /f /t .
git add .
git commit -a -m %*
git push

cd %dir%
