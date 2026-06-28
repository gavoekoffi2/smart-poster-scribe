import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Zap, AlertTriangle, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";

type Log = { created_at: string; endpoint: string; status_code: number; latency_ms: number | null };

export function ApiUsageTab({ userId }: { userId: string }) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const { data } = await supabase
        .from("api_usage_logs")
        .select("created_at,endpoint,status_code,latency_ms")
        .eq("user_id", userId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);
      setLogs((data as Log[]) || []);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-1">Aucune requête API enregistrée</p>
          <p className="text-xs text-muted-foreground">Créez une clé API depuis l'onglet API pour commencer.</p>
        </CardContent>
      </Card>
    );
  }

  // Daily series
  const byDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const k = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(5, 10);
    byDay[k] = 0;
  }
  logs.forEach((l) => { const k = l.created_at.slice(5, 10); if (k in byDay) byDay[k]++; });
  const series = Object.entries(byDay).map(([date, count]) => ({ date, count }));

  // Latency p50/p95
  const lats = logs.map((l) => l.latency_ms || 0).filter((v) => v > 0).sort((a, b) => a - b);
  const p = (q: number) => lats.length ? lats[Math.floor(lats.length * q)] : 0;
  const errors4xx = logs.filter((l) => l.status_code >= 400 && l.status_code < 500).length;
  const errors5xx = logs.filter((l) => l.status_code >= 500).length;
  const total = logs.length;
  const errorRate = total > 0 ? ((errors4xx + errors5xx) / total) * 100 : 0;

  // Top endpoints
  const topEp: Record<string, number> = {};
  logs.forEach((l) => { topEp[l.endpoint] = (topEp[l.endpoint] || 0) + 1; });
  const top = Object.entries(topEp).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-5"><p className="text-2xl font-bold">{total}</p><p className="text-xs text-muted-foreground">Requêtes (30j)</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-2xl font-bold">{p(0.5)} ms</p><p className="text-xs text-muted-foreground">Latence p50</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-2xl font-bold">{p(0.95)} ms</p><p className="text-xs text-muted-foreground">Latence p95</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-2xl font-bold flex items-center gap-1">{errorRate.toFixed(1)}%{errorRate > 5 && <AlertTriangle className="w-4 h-4 text-yellow-500" />}</p><p className="text-xs text-muted-foreground">Taux d'erreur</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" />Requêtes par jour</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Top endpoints</CardTitle><CardDescription>Endpoints les plus appelés</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {top.map(([ep, n]) => (
            <div key={ep} className="flex items-center justify-between py-2 border-b last:border-0">
              <code className="text-xs">{ep}</code>
              <Badge variant="secondary">{n}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {(errors4xx > 0 || errors5xx > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-yellow-500 flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Erreurs</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-6 text-sm">
              <div><span className="font-bold text-lg">{errors4xx}</span> <span className="text-muted-foreground">erreurs 4xx</span></div>
              <div><span className="font-bold text-lg">{errors5xx}</span> <span className="text-muted-foreground">erreurs 5xx</span></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
