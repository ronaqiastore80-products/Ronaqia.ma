@echo off
title Ronaqia - Serveur Local (Admin)
cd /d "%~dp0"
echo.
echo  ========================================
echo   Serveur LOCAL Ronaqia
echo  ========================================
echo.
echo  Site public: http://localhost:3000
echo  Admin:       http://localhost:3000/admin.html
echo  Login:       admin / admin123
echo.
echo  Le site public lit data/packs.json en statique.
echo  Pour GitHub Pages: exportez depuis l'admin
echo  puis copiez data/packs.json + data/config.json
echo.
echo  NE FERMEZ PAS cette fenetre en local!
echo  ========================================
echo.
node server.js
pause
