# Termux single-command deploy/upload helper

If this folder is extracted beside your Git repository, replace the URL/branch if needed:

`cd "/storage/emulated/0/E-SPORTS BOT" && rm -rf DYNEX-Dashboard-temp && git clone git@github.com:ItzWahab001/DYNEX-Dashboard.git DYNEX-Dashboard-temp && cd DYNEX-Dashboard-temp && git config --global --add safe.directory "$PWD" && unzip -o ../DYNEX-Dashboard.zip >/dev/null && if [ -d DYNEX-Dashboard ]; then cp -rf DYNEX-Dashboard/. . && rm -rf DYNEX-Dashboard; fi && git add . && git commit -m "Deploy DYNEX dashboard" && git push origin main`

Before running it, put `DYNEX-Dashboard.zip` in `/storage/emulated/0/E-SPORTS BOT/` and create the GitHub repository.
