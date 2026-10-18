@echo off
title Hidroket GP Sunucusu
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js bulunamadi. Once Node.js kurman gerekiyor.
  echo  Simdi indirme sayfasi acilacak: LTS yazan butona bas, indir ve kur.
  echo  Kurulum bitince bu dosyaya tekrar cift tikla.
  echo.
  start "" https://nodejs.org/
  pause
  exit /b
)
if not exist "public\index.html" (
  echo.
  echo  Oyun dosyalari bulunamadi. Zip dosyasini once "Tumunu ayikla" ile cikar,
  echo  sonra cikan klasordeki BASLAT.bat dosyasina cift tikla.
  echo.
  pause
  exit /b
)
echo.
echo  ==========================================
echo    HIDROKET GP basliyor...
echo    Bu siyah pencereyi KAPATMA.
echo    Oyun bu pencere acik kaldikca calisir.
echo  ==========================================
echo.
start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"
node server.js
echo.
echo  Sunucu durdu.
pause
