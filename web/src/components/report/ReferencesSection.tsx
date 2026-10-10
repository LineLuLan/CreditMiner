"use client";

import { ReportSection } from "./ReportPrimitives";

export const REFERENCES = [
  'I-C. Yeh and C.-h. Lien, "The comparisons of data mining techniques for the predictive accuracy of probability of default of credit card clients," Expert Systems with Applications, vol. 36, no. 2, pp. 2473-2480, 2009.',
  'UCI Machine Learning Repository, "Default of Credit Card Clients" (dataset 350), https://archive.ics.uci.edu/dataset/350/default+of+credit+card+clients, accessed 26 September 2026. Licence CC BY 4.0.',
  'I. H. Witten, E. Frank, M. A. Hall, and C. J. Pal, Data Mining: Practical Machine Learning Tools and Techniques, 4th ed. Morgan Kaufmann, 2016.',
  'E. Frank, M. A. Hall, and I. H. Witten, "The WEKA Workbench," online appendix for [3], 2016. Weka 3.8.6, University of Waikato.',
  'J. R. Quinlan, C4.5: Programs for Machine Learning. Morgan Kaufmann, 1993.',
  'L. Breiman, "Random forests," Machine Learning, vol. 45, no. 1, pp. 5-32, 2001.',
  'N. V. Chawla, K. W. Bowyer, L. O. Hall, and W. P. Kegelmeyer, "SMOTE: Synthetic minority over-sampling technique," Journal of Artificial Intelligence Research, vol. 16, pp. 321-357, 2002.',
  'R. Agrawal and R. Srikant, "Fast algorithms for mining association rules," in Proc. 20th VLDB, 1994, pp. 487-499.',
  'R. Srikant and R. Agrawal, "Mining sequential patterns: Generalizations and performance improvements," in Proc. EDBT \'96, Springer, 1996, pp. 3-17.',
  'R. Kohavi, "A study of cross-validation and bootstrap for accuracy estimation and model selection," in Proc. IJCAI, 1995, pp. 1137-1143.',
  'J. MacQueen, "Some methods for classification and analysis of multivariate observations," in Proc. 5th Berkeley Symposium on Mathematical Statistics and Probability, 1967, pp. 281-297.',
  'S. Beer, "generalizedSequentialPatterns," Weka package version 1.0.1, 2012.',
] as const;

export function ReferencesSection({ id = "references" }: { id?: string }) {
  return (
    <ReportSection id={id} title="References">
      <ol className="space-y-2 text-sm leading-6 text-muted-foreground">
        {REFERENCES.map((reference, index) => <li key={reference} className="break-inside-avoid break-words [overflow-wrap:anywhere]">[{index + 1}] {reference}</li>)}
      </ol>
    </ReportSection>
  );
}
