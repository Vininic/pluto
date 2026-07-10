import { Link } from "react-router-dom";
import { PlutoMark } from "@/components/PlutoLogo";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/I18nProvider";

export default function NotFound() {
  const t = useT();
  const L = t.pluto.notFound;

  return (
    <div className="pluto-surface grid min-h-screen place-items-center p-8">
      <div className="text-center">
        <PlutoMark className="mx-auto h-14 w-14 text-secondary" />
        <h1 className="font-display mt-6 text-3xl text-primary">{L.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{L.lead}</p>
        <Button asChild className="mt-6 bg-primary text-primary-foreground hover:bg-primary-deep">
          <Link to="/dashboard">{L.backToApp}</Link>
        </Button>
      </div>
    </div>
  );
}
