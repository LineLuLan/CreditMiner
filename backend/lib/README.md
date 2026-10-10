# Weka GSP package

CreditMiner's Phase 10 sequence miner uses Weka's official
`generalizedSequentialPatterns` package version 1.0.1 by Sebastian Beer (2012).
The package is licensed under GPL 3.0 and requires Weka 3.7.1 or newer.

The jar is kept in this directory so the assignment can be built on an offline
grader. Install it into the grader's local Maven repository from `backend/`:

```powershell
mvn install:install-file -Dfile=lib/generalizedSequentialPatterns-1.0.1.jar -DpomFile=lib/generalizedSequentialPatterns-1.0.1.pom
```

The project then resolves the normal compile dependency
`nz.ac.waikato.cms.weka:generalizedSequentialPatterns:1.0.1` from that local
repository. Maven supplies Weka's runtime dependencies to both tests and the
shaded CLI jar.
