# CreditMiner documentation

This index points to the current technical and submission documents.

| Document | Purpose |
|---|---|
| [Project README](../README.md) | Project overview, results, setup, CLI, and licence information |
| [Architecture](../Architecture.md) | System context, components, data contracts, profiles, packaging, and security |
| [API](API.md) | REST endpoints, parameters, request bodies, responses, and errors |
| [Pipeline](PIPELINE.md) | Offline mining phases, commands, inputs, outputs, and verified timing evidence |
| [Project roadmap](Project_Roadmap.md) | Completed work, remaining work, and submission milestones |
| [Submission](SUBMISSION.md) | Required submission directory and packaging procedure |
| [Web application](../web/README.md) | Frontend instructions; the STE report is served at `/mining-report` |
| Academic report | Run the web app and open `/report/paper`; print it to `report.pdf` |
| [Historical archive](archive/) | Superseded project documents retained for audit history |

Generated evidence is stored under `backend/data/processed/` and `backend/models/`. These artifacts feed the API and both report views. See [Pipeline](PIPELINE.md) for the exact contracts.

