# Submission guide

## Required structure

The final directory must use the member IDs and names required by the instructor. Replace the placeholder only after the team roster is confirmed.

```text
yourMemberIDs_Names/
|-- report.pdf
`-- code/
    |-- README.md
    |-- backend/
    |-- web/
    |-- docs/
    |-- scripts/
    `-- other source and configuration files required by the project
```

Do not invent missing member details. The exact directory name is to be confirmed with the instructor.

## Build procedure

The repository packaging entry point is `scripts/build-submission.ps1`. It will build the submission folder. Run it from the repository root after the script is available and the academic report has been exported.

```powershell
pwsh -File scripts/build-submission.ps1
```

The script implementation is outside the scope of this document. Review its help or parameters before use.

## Prepare the report

1. Start the backend and frontend with the documented local-demo procedure.
2. Open `/report/paper` in the browser.
3. Use the browser print command.
4. Select PDF output and save the file as `report.pdf`.
5. Check page breaks, charts, tables, author details, and citations.

The `/mining-report` route is the STE web report. It is useful for review and demonstration, but it is not the required `report.pdf` file.

## Final checks

- Confirm that `report.pdf` opens and includes every required section.
- Confirm that `code/` contains source code and current documentation.
- Exclude `.env` files, credentials, build caches, dependency directories, and local database files.
- Keep the UCI dataset citation and licence notice.
- Run backend and frontend quality gates before packaging.
- Inspect the generated directory and ZIP manually.
- Confirm the team roster and final directory name.
- Confirm the packaging rule with the instructor.

## Rollback

The packaging step must write to a separate output directory. If a package is wrong, remove only that generated output and run the script again. Do not alter source files to repair a package.

