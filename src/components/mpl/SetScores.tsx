import { tr } from "@/lib/i18n";
import type { MatchResult } from "@/lib/bracket";
/** 5B-1 (U-13) : score présenté set par set (pastilles séparées) ; le texte brut reste « 6-3 6-4 » (copier-coller, lecteurs d'écran, tests). Forfait / abandon traduits. */
export function SetScores({ r }: { r: Pick<MatchResult, "kind" | "sets"> }) {
  if (r.kind === "walkover") return <span data-score-walkover>{tr("W.O.")}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1" data-set-scores>
      {r.sets.map(([a, b], i) => (<span key={i}>{i > 0 ? " " : null}<span className="inline-block rounded bg-muted px-1.5 py-0.5 font-semibold text-foreground" data-set>{a}-{b}</span></span>))}
      {r.kind === "retired" && <span className="ml-0.5 text-muted-foreground">{" "}{tr("ret.")}</span>}
    </span>
  );
}
/** 5B-2 : même présentation pour un score déjà formaté (« 6-3 6-4 »). */
export function ScoreString({ score }: { score: string }) {
  if (!score) return null;
  return <span className="inline-flex flex-wrap items-center gap-1" data-set-scores>{score.split(" ").map((x, i) => <span key={i} className="inline-block rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground num" data-set>{x}</span>)}</span>;
}
