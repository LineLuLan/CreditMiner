# Third-party software and dataset notices

Prepared for CreditMiner, IT160IU. Sources checked 2026-10-10. These notices identify the main mining dependencies and dataset; dependency JARs retain their own embedded notices and licences.

## Weka 3.8.6

Weka is developed by the Machine Learning Group at the University of Waikato and contributors. Weka is distributed under the GNU General Public License version 3 (GPL 3.0). The CLI and web JARs include Weka classes.

- Project, downloads, and source: https://ml.cms.waikato.ac.nz/weka/
- Licence text: https://www.gnu.org/licenses/gpl-3.0.html
- Dependency coordinates: `nz.ac.waikato.cms.weka:weka-stable:3.8.6`.

## Generalized Sequential Patterns (GSP) 1.0.1

The Weka `generalizedSequentialPatterns` package by Sebastian Beer (2012) is distributed under GPL 3.0. The bundled JAR and POM are in `source/backend/lib/`; installation instructions are in that directory's README. The licence/version attribution is recorded there and in the bundled package metadata.

- Upstream package metadata: https://weka.sourceforge.io/packageMetaData/generalizedSequentialPatterns/1.0.1.html
- API documentation: https://weka.sourceforge.io/doc.stable/weka/associations/GeneralizedSequentialPatterns.html
- Licence text: https://www.gnu.org/licenses/gpl-3.0.html
- Dependency coordinates: `nz.ac.waikato.cms.weka:generalizedSequentialPatterns:1.0.1`.

The upstream package metadata page was unavailable during the check; the local package record supplies this attribution. Preserve applicable notices when redistributing the included software. The application source and build instructions accompany the binaries; upstream dependency source is available through the project links above.

## Default of Credit Card Clients (UCI 350)

The dataset is licensed under Creative Commons Attribution 4.0 International (CC BY 4.0).

- Dataset: https://archive.ics.uci.edu/dataset/350/default+of+credit+card+clients
- Licence: https://creativecommons.org/licenses/by/4.0/
- Dataset citation: Yeh, I. (2009). *Default of Credit Card Clients*. UCI Machine Learning Repository. https://doi.org/10.24432/C55S3H.
- Associated study: Yeh, I.-C. and Lien, C.-H. (2009). *The comparisons of data mining techniques for the predictive accuracy of probability of default of credit card clients*. Expert Systems with Applications, 36(2), 2473-2480. https://doi.org/10.1016/j.eswa.2007.12.020.

Changes: source spreadsheet converted to CSV; categorical fields mapped; 35 duplicate rows removed; features engineered; stratified seed-42 training/test split and six-month repayment sequences generated. The original has 30,000 clients; processed data has 29,965. Attribution does not imply endorsement by the authors or UCI.
