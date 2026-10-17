# Requirements and First Steps

This file tells you what you must have and what you must do after you clone this repository.
Read it before you build, train, or run CreditMiner.

## 1. What CreditMiner is

CreditMiner predicts credit-card default on UCI dataset 350 (Default of Credit Card Clients).
The backend is Java with Spring Boot and Weka. The web app is Next.js.
The project is a course project for IT160IU Data Mining.

## 2. Supported system

- Windows 10 or Windows 11 (the one-click scripts are Windows batch files).
- Linux or macOS work for the manual commands in `README.md`.
- At least 8 GB of RAM. The demo backend uses up to 1 GB of heap.
- At least 3 GB of free disk space for the build, the artifacts, and the models.
- Internet access for the first build. Maven and pnpm download the dependencies one time.

## 3. Software you must install

| Software | Version | Check with |
| --- | --- | --- |
| Java Development Kit | 17 or later (tested with 21) | `java -version` |
| Apache Maven | 3.9 or later | `mvn -version` |
| Node.js | 20 or later | `node --version` |
| Corepack (comes with Node.js) | any | `corepack --version` |
| Git | any | `git --version` |

Make sure that `java`, `mvn`, `node`, and `corepack` are on your PATH.
On Line's machine the portable JDK and Maven are in `D:\tools`. `run.bat` finds them there.

## 4. What the repository contains and what it does not contain

The repository contains the source code, the tests, the documentation, and the small JSON artifacts of the pipeline.

The repository does not contain these files. Git ignores them because they are large or regenerable.

| Missing after clone | Path | Size | How to get it |
| --- | --- | --- | --- |
| Prepared ARFF files | `backend/data/processed/*.arff` | 37 MB | Section 6 |
| Trained models | `backend/models/*.model` | 126 MB | Section 6 |
| Mined rules | `backend/models/rules.json` | 65 KB | Section 6 |
| Report PDF for the download button | `web/public/report.pdf` | 1.1 MB | Section 9 |

The demo does not start without the ARFF files, the models, and `rules.json`.

## 5. Get the dataset

The repository contains the dataset as `backend/data/raw/default_credit_card_clients.csv` (2.9 MB, CC BY 4.0).
You do not need this section unless the file is missing or you want a fresh copy from the source.

1. Open https://archive.ics.uci.edu/dataset/350/default+of+credit+card+clients.
2. Download the file `default of credit card clients.xls`.
3. Open the file in Excel or LibreOffice.
4. Delete the first row. The first row contains the codes `X1` to `X23`.
5. Keep the second row. It contains the column names from `ID` to `default payment next month`.
6. Save the sheet as CSV with a comma separator and UTF-8 encoding.
7. Name the file `default_credit_card_clients.csv`.
8. Put the file in `backend/data/raw/`.

The first line of the CSV file must be:

```
ID,LIMIT_BAL,SEX,EDUCATION,MARRIAGE,AGE,PAY_0,PAY_2,PAY_3,PAY_4,PAY_5,PAY_6,BILL_AMT1,BILL_AMT2,BILL_AMT3,BILL_AMT4,BILL_AMT5,BILL_AMT6,PAY_AMT1,PAY_AMT2,PAY_AMT3,PAY_AMT4,PAY_AMT5,PAY_AMT6,default payment next month
```

The file has 30,000 data rows. The dataset license is CC BY 4.0. Keep the citation (Yeh and Lien, 2009) in every report.

## 6. Build the backend and train the artifacts

Run the training script from the repository root. It builds the backend and runs the eight pipeline phases in order.

Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\train.ps1
```

Bash:

```bash
bash scripts/train.sh
```

The script writes the ARFF files, the JSON artifacts, the models, and `rules.json`.
The classification phase trains ten model variants with cross-validation. The full run can take 30 minutes on a laptop.
The clustering phase uses `CM_CLUSTER_K=4`. The script sets this variable. Do not change it, or the personas in the web app and the report will not match the artifacts.

If Maven fails with a missing dependency, run it one time without the `-o` flag. Then run the script again.

## 7. Run the demo

Windows: double-click `run.bat` in the repository root.

The script does these steps:

1. It checks Java, Maven, Node.js, and Corepack.
2. It builds the backend JAR if the JAR is missing.
3. It installs the web dependencies and builds the web app if the build is missing.
4. It starts the backend on port 8091 and the web app on port 3001, each in its own window.
5. It waits until the in-memory database is seeded.
6. It opens http://localhost:3001 in your browser.

Use `run.bat --check` to see the tool paths and the commands without a start.
Use `run.bat --no-browser` to start without a browser.
Double-click `stop.bat` to stop the two servers.

Linux and macOS: follow the manual commands in `README.md`, section "Quick start".

The web app calls the API at `http://localhost:8091/api`. Do not change the ports unless you also rebuild the web app with a new `NEXT_PUBLIC_API_URL`.

## 8. Run the tests

Backend, from `backend/`:

```powershell
mvn -q test
```

Web, from `web/`:

```powershell
corepack pnpm typecheck
corepack pnpm lint
node --test (Get-ChildItem -Recurse -Path src -Filter *.test.mjs | ForEach-Object { $_.FullName })
```

All backend tests (183) and all web tests (141) pass on the commit that contains this file.

## 9. Build the submission package

The submission builder makes the zip file for the course. It builds both apps, starts both servers, renders the report PDF, and packs everything.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-submission.ps1 -TeamFolder <StudentIDs_Names>
```

The output is `dist\<TeamFolder>.zip`. The builder also writes `web/public/report.pdf`, which the download button on the Mining Report page uses.
Before you build the final package, fill in the team rows in `web/src/components/report/TeamTable.tsx` and `docs/submission-README.md`.

## 10. Known limits

- Ports 8091 and 3001 must be free. The scripts do not use ports 3000 and 8080.
- The first page load after a start can be slow while the database is seeded.
- The models are trained with seed 42. If you retrain on a different machine, small differences in the metrics are possible.
- The `prod` profile needs a PostgreSQL database and the variables `DATABASE_URL`, `DB_USER`, and `DB_PASSWORD`. The demo does not need them.
- Never commit the raw dataset copies that you make for other purposes, the `.env` file, or credentials.
