"use client";

import { ReportTable } from "./ReportPrimitives";

const TEAM = [
  ["Leader", "Tran Nam Anh", "ITDSIU23030", "Team leader"],
  ["Member 2", "[Full name]", "[Student ID]", "[Role]"],
  ["Member 3", "[Full name]", "[Student ID]", "[Role]"],
] as const;

export function TeamTable({ id = "paper-team" }: { id?: string }) {
  return <ReportTable id={id} caption="Project team."><table className="w-full text-sm"><thead><tr className="border-b"><th className="p-2 text-left">Member</th><th className="p-2 text-left">Full name</th><th className="p-2 text-left">Student ID</th><th className="p-2 text-left">Role</th></tr></thead><tbody>{TEAM.map((row) => <tr key={row[0]} className="border-b last:border-0">{row.map((cell) => <td key={cell} className="p-2">{cell}</td>)}</tr>)}</tbody></table></ReportTable>;
}
