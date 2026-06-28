import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, XCircle, Wrench } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

type Service = { id: string; service: string; status: string; message: string | null; updated_at: string };

const ICONS: Record<string, { icon: any; color: string; label: string }> = {
  operational: { icon: CheckCircle2, color: "text-green-500", label: "Opérationnel" },
  degraded: { icon: AlertTriangle, color: "text-yellow-500", label: "Dégradé" },
  down: { icon: XCircle, color: "text-red-500", label: "Indisponible" },
  maintenance: { icon: Wrench, color: "text-blue-500", label: "Maintenance" },
};

export default function StatusPage() {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    supabase.from("service_health").select("*").order("service").then(({ data }) => setServices((data as Service[]) || []));
  }, []);

  const allOk = services.every((s) => s.status === "operational");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto max-w-3xl px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">État de la plateforme</h1>
          <p className={`text-lg ${allOk ? "text-green-500" : "text-yellow-500"}`}>
            {allOk ? "✓ Tous les systèmes sont opérationnels" : "⚠ Incidents en cours"}
          </p>
        </div>
        <Card>
          <CardHeader><CardTitle>Services</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {services.map((s) => {
              const cfg = ICONS[s.status] || ICONS.operational;
              const Icon = cfg.icon;
              return (
                <div key={s.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">{s.service}</p>
                    {s.message && <p className="text-xs text-muted-foreground">{s.message}</p>}
                  </div>
                  <div className={`flex items-center gap-2 ${cfg.color} text-sm font-medium`}>
                    <Icon className="w-5 h-5" />{cfg.label}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground text-center mt-6">
          Mis à jour automatiquement. Signaler un incident : contact@graphistegpt.pro
        </p>
      </main>
      <Footer />
    </div>
  );
}
