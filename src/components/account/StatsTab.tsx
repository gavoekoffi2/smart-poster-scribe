import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, TrendingUp, Image as ImageIcon, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

type Row = { created_at: string; type: string };

export function StatsTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [domains, setDomains] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const [{ data: tx }, { data: imgs }] = await Promise.all([
        supabase.from("credit_transactions").select("created_at,type").eq("user_id", userId).gte("created_at", since),
        supabase.from("generated_images").select("domain").eq("user_id", userId).gte("created_at", since),
      ]);
      setRows((tx as Row[]) || []);
      const counts: Record<string, number> = {};
      (imgs || []).forEach((i: any) => { const d = i.domain || "Autre"; counts[d] = (counts[d] || 0) + 1; });
      setDomains(Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5));
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  // Build daily series
  const byDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000);
    const k = d.toISOString().slice(5, 10);
    byDay[k] = 0;
  }
  rows.filter((r) => ["generation", "free_generation"].includes(r.type)).forEach((r) => {
    const k = r.created_at.slice(5, 10);
    if (k in byDay) byDay[k]++;
  });
  const series = Object.entries(byDay).map(([date, count]) => ({ date, count }));
  const total = series.reduce((s, x) => s + x.count, 0);
  const avg = (total / 30).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><ImageIcon className="w-8 h-8 text-primary" /><div><p className="text-2xl font-bold">{total}</p><p className="text-xs text-muted-foreground">Générations (30j)</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingUp className="w-8 h-8 text-primary" /><div><p className="text-2xl font-bold">{avg}</p><p className="text-xs text-muted-foreground">Moyenne / jour</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Calendar className="w-8 h-8 text-primary" /><div><p className="text-2xl font-bold">{domains.length}</p><p className="text-xs text-muted-foreground">Domaines utilisés</p></div></div></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Activité — 30 derniers jours</CardTitle></CardHeader>
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
      {domains.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Top domaines</CardTitle><CardDescription>Vos types d'affiches les plus créés</CardDescription></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={domains}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
