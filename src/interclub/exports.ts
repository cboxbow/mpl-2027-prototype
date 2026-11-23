/** Exports de démonstration du dossier d'engagement : CSV (3 fichiers) et vue imprimable (PDF par impression). Aucune donnée réelle. */
import { CURRENT_LANG, tr } from "@/lib/i18n";
import { PROPOSED_DATES } from "./capacity";
import { deriveStatus, rankLabel, wantedDivisions, type Dossier } from "./engagement";

export const LINE_LABEL = { draft: tr("Draft"), submitted: tr("Submitted"), to_complete: tr("To complete"), accepted: tr("Accepted (simulated)"), refused: tr("Refused (simulated)"), partial: tr("Partially accepted") } as const;
export const AVAIL_LABEL = { "": tr("Not filled"), yes: tr("Available"), maybe: tr("Maybe"), no: tr("Unavailable") } as const;
/** Séparateur : point-virgule en français, virgule en anglais (usage des tableurs). */
export const SEP = CURRENT_LANG === "fr" ? ";" : ",";
export const WATERMARK = "MPL 2027 — DESIGN PROTOTYPE · " + tr("unofficial document");
const esc = (v: string | number) => { const t = String(v); return /["\n;,]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
export const toCsv = (rows: Array<Array<string | number>>, sep = SEP) => "﻿" + rows.map((r) => r.map(esc).join(sep)).join("\r\n") + "\r\n";
const stamp = (d: Dossier) => [`# ${WATERMARK}`, `# ${d.id} · v${d.version}`];
export function csvLines(d: Dossier, clubName: string) { const ws = wantedDivisions(d.form); return toCsv([[WATERMARK], [tr("Club"), tr("Division"), tr("Status"), tr("Note")], ...ws.map((c) => [clubName, c, LINE_LABEL[d.lines[c]?.status ?? "draft"], d.lines[c]?.note ?? ""])]); }
export function csvPlayers(d: Dossier, clubName: string) { return toCsv([[WATERMARK], [tr("Club"), tr("Division"), tr("Player"), tr("MPL rank"), tr("Pair")], ...d.form.players.map((p) => [clubName, p.division, p.name, rankLabel(p.rank), p.pair || "—"])]); }
export function csvAvailability(d: Dossier, clubName: string) { return toCsv([[WATERMARK], [tr("Club"), tr("Day"), tr("Date"), tr("Availability")], ...PROPOSED_DATES.map((dt, i) => [clubName, `J${i + 1}`, dt, AVAIL_LABEL[d.form.availability[i] ?? ""]])]); }
export const csvAll = (d: Dossier, clubName: string) => ({ lines: csvLines(d, clubName), players: csvPlayers(d, clubName), availability: csvAvailability(d, clubName) });
void stamp;
const h = (s: string | number) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
/** Vue imprimable (3 pages) avec filigrane « non officiel ». L'utilisateur l'enregistre en PDF via la boîte d'impression du navigateur. */
export function printableHtml(d: Dossier, clubName: string): string {
  const f = d.form; const ws = wantedDivisions(f); const st = deriveStatus(d.lines);
  const row = (a: string, b: string | number) => `<tr><th>${h(a)}</th><td>${h(b)}</td></tr>`;
  const css = `body{font:13px/1.45 system-ui,sans-serif;color:#111;margin:24px}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:18px 0 6px;border-bottom:1px solid #999}table{border-collapse:collapse;width:100%;margin-bottom:8px}th,td{border:1px solid #bbb;padding:4px 6px;text-align:left}th{background:#f1f1f1;width:34%}.wm{position:fixed;inset:0;display:grid;place-items:center;font-size:42px;font-weight:800;color:rgba(200,0,0,.10);transform:rotate(-24deg);pointer-events:none;text-align:center}.pb{page-break-after:always}.note{background:#fff3cd;border:1px solid #e0c060;padding:6px 8px;margin:8px 0}@media print{.noprint{display:none}}`;
  return `<!doctype html><html lang="${CURRENT_LANG}"><head><meta charset="utf-8"><title>${h(d.id)}</title><style>${css}</style></head><body>
<div class="wm">${h(WATERMARK)}</div>
<button class="noprint" onclick="window.print()">${h(tr("Print / save as PDF"))}</button>
<h1>${h(tr("Interclub 2027 — club engagement form"))}</h1><p>${h(clubName)} · ${h(d.id)} · v${d.version} · ${h(LINE_LABEL[st])}</p>
<div class="note">${h(tr("Demonstration document: fictional data, no payment, no legal signature. Rules shown are proposals, not official rules."))}</div>
<h2>1. ${h(tr("Club"))}</h2><table>${row(tr("Official name"), f.club.officialName)}${row(tr("Legal name / BRN"), f.club.legalName)}${row(tr("Padel Federation registration no."), f.club.regNo)}${row(tr("Address"), `${f.club.address}, ${f.club.city}`)}${row(tr("Phone"), f.club.phone)}${row("E-mail", f.club.email)}</table>
<h2>2. ${h(tr("Official contact"))}</h2><table>${row(tr("Name"), `${f.contact.firstName} ${f.contact.lastName}`)}${row(tr("Role"), f.contact.role)}${row(tr("Phone"), f.contact.phone)}${row("E-mail", f.contact.email)}</table>
<h2>3. ${h(tr("Requested divisions"))}</h2><table><tr><th>${h(tr("Division"))}</th><th>${h(tr("Status"))}</th></tr>${ws.map((c) => `<tr><td>${h(c)}</td><td>${h(LINE_LABEL[d.lines[c]?.status ?? "draft"])}${d.lines[c]?.note ? " — " + h(d.lines[c].note!) : ""}</td></tr>`).join("")}</table><div class="pb"></div>
<h2>4. ${h(tr("Players and rankings"))}</h2><table><tr><th>${h(tr("Division"))}</th><th>${h(tr("Player"))}</th><th>${h(tr("MPL rank"))}</th><th>${h(tr("Pair"))}</th></tr>${f.players.map((p) => `<tr><td>${h(p.division)}</td><td>${h(p.name)}</td><td>${h(rankLabel(p.rank))}</td><td>${h(p.pair || "—")}</td></tr>`).join("")}</table>
<h2>5. ${h(tr("Courts and hosting capacity"))}</h2><table>${row(tr("Homologated courts"), f.hosting.homologated)}${row(tr("Courts available on Friday evening (declared)"), f.hosting.fridayCourts)}${row(tr("Simultaneous ties"), f.hosting.simultaneous)}${row(tr("Lighting"), f.hosting.lighting ? tr("Yes") : tr("No"))}${row(tr("Partner club agreement"), f.hosting.partnerConvention ? tr("Yes") : tr("No"))}</table><div class="pb"></div>
<h2>6. ${h(tr("Availability on the ten proposed days"))}</h2><table><tr><th>${h(tr("Day"))}</th><th>${h(tr("Date"))}</th><th>${h(tr("Availability"))}</th></tr>${PROPOSED_DATES.map((dt, i) => `<tr><td>J${i + 1}</td><td>${dt}</td><td>${h(AVAIL_LABEL[f.availability[i] ?? ""])}</td></tr>`).join("")}</table>
<h2>7. ${h(tr("Declarations"))}</h2><table>${row(tr("Rules acknowledged"), f.declarations.rules ? "✓" : "—")}${row(tr("Player exclusivity"), f.declarations.exclusivity ? "✓" : "—")}${row(tr("Courts or agreement"), f.declarations.courts ? "✓" : "—")}${row(tr("Fee accepted (proposed, no payment)"), f.declarations.fee ? "✓" : "—")}</table>
</body></html>`;
}
export function downloadText(name: string, text: string, mime = "text/csv;charset=utf-8") { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
export function openPrint(html: string) { const w = window.open(URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" })), "_blank"); if (w) w.addEventListener("load", () => w.print()); return !!w; }
