@echo off
setlocal

set "MODEL="
if not "%~1"=="" (
  set "FIRST_ARG=%~1"
  if /i not "%FIRST_ARG:~0,1%"=="-" (
    set "MODEL=%~1"
    shift
  )
)

if "%MODEL%"=="" if not "%OPENROUTER_MODEL%"=="" set "MODEL=%OPENROUTER_MODEL%"
if "%MODEL%"=="" set "MODEL=deepseek/deepseek-v3.2"

if "%OPENAI_API_KEY%"=="" if not "%OPENROUTER_API_KEY%"=="" set "OPENAI_API_KEY=%OPENROUTER_API_KEY%"

if "%OPENAI_API_KEY%"=="" (
  echo Missing OPENROUTER_API_KEY or OPENAI_API_KEY.
  echo.
  echo Example:
  echo   set OPENROUTER_API_KEY=sk-or-...
  echo   openrouter.bat
  exit /b 1
)

codex -c model_provider="openrouter" -c model="%MODEL%" %*
