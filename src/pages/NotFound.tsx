import { Link } from "react-router-dom";
import { tr } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
/** 5B-1 (U-04) : titre de niveau 1 et issues de secours vers les pages publiques. */
export default function NotFound() {
  return <div className="container-mpl grid min-h-[50vh] place-items-center py-10 text-center"><div>
    <p className="text-6xl font-bold text-primary" aria-hidden="true">404</p>
    <h1 className="mt-2 text-2xl font-bold">{tr("404 — page not found")}</h1>
    <p className="mt-2 text-muted-foreground">{tr("This page does not exist in the prototype.")}</p>
    <p className="mt-6 text-sm font-medium">{tr("Where would you like to go?")}</p>
    <div className="mt-3 flex flex-wrap justify-center gap-2"><Button asChild><Link to="/">{tr("Back to home")}</Link></Button><Button asChild variant="outline"><Link to="/calendar">{tr("Calendar")}</Link></Button><Button asChild variant="outline"><Link to="/rankings">{tr("Rankings")}</Link></Button><Button asChild variant="outline"><Link to="/interclub-public">{tr("Interclub portal")}</Link></Button></div>
  </div></div>;
}
