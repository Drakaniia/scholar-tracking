@echo off
echo Setting up Git repository...
git init
if %errorlevel% neq 0 (
    echo Error initializing Git repository
    exit /b %errorlevel%
)

echo Configuring user information...
git config --local user.name "Drakaniia"
git config --local user.email "floresaybaez574@gmail.com"

echo Adding files to repository...
git add .
if %errorlevel% neq 0 (
    echo Error adding files
    exit /b %errorlevel%
)

echo Creating initial commit...
git commit -m "chore: initial commit of scholarship tracking system"
if %errorlevel% neq 0 (
    echo Error creating commit
    exit /b %errorlevel%
)

echo Checking remote origin...
for /f %%i in ('git remote') do (
    if "%%i"=="origin" (
        echo Remote origin already exists, removing it...
        git remote remove origin
    )
)

echo Adding remote origin...
git remote add origin https://github.com/Drakaniia/scholar-tracking.git
if %errorlevel% neq 0 (
    echo Error adding remote origin
    exit /b %errorlevel%
)

echo Checking if master branch exists locally...
git branch -M master
if %errorlevel% neq 0 (
    echo Error renaming branch to master
    exit /b %errorlevel%
)

echo Pushing to master branch...
git push -u origin master --force
if %errorlevel% neq 0 (
    echo Error pushing to remote
    exit /b %errorlevel%
)

echo Repository setup and push completed successfully!