# CreditMiner Training Log

No full artifact training run has been executed in this workspace yet.

Use:

```bat
scripts\train-artifacts.bat --check
scripts\train-artifacts.bat
```

Requirements:

- `backend\data\raw\BankChurners.csv`
- JDK 17+ or 21 LTS
- Maven 3.9.x

Safety:

- This training runner creates local files under `backend\data\processed` and `backend\models`.
- It does not seed/reset databases, run SQL, deploy, or read `.env` files.
- Database seeding remains a separate explicit-confirmation step because it deletes and rewrites `customers`, `clusters`, and `rules`.
