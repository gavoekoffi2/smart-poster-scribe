import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { CheckCircle, XCircle, ExternalLink, Clock, Users } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

interface Designer {
  id: string;
  display_name: string;
  bio: string | null;
  portfolio_url: string | null;
  is_verified: boolean;
  templates_count: number;
  total_earnings: number;
  created_at: string;
  user_id: string;
}

export default function AdminDesigners() {
  const navigate = useNavigate();
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDesigners(); }, []);

  const fetchDesigners = async () => {
    try {
      const { data, error } = await supabase.from("partner_designers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setDesigners(data || []);
    } catch (error) {
      console.error("Error fetching designers:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const toggleVerification = async (designerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("partner_designers").update({ is_verified: !currentStatus }).eq("id", designerId);
      if (error) throw error;
      if (!currentStatus) {
        const designer = designers.find(d => d.id === designerId);
        if (designer) {
          await supabase.from("user_roles").upsert({ user_id: designer.user_id, role: "designer" }, { onConflict: "user_id,role" });
        }
      }
      setDesigners(designers.map(d => d.id === designerId ? { ...d, is_verified: !currentStatus } : d));
      toast.success(currentStatus ? "Graphiste non vérifié" : "Graphiste vérifié !");
    } catch (error) {
      console.error("Error updating designer:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const pendingDesigners = designers.filter(d => !d.is_verified);
  const verifiedDesigners = designers.filter(d => d.is_verified);

  return (
    <AdminLayout requiredPermission="manage_designers">
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-foreground">Gestion des Graphistes</h2>
        <p className="text-muted-foreground">Validez et gérez les graphistes partenaires</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="bg-card/60 border-border/40"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" />Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{designers.length}</div></CardContent></Card>
        <Card className="bg-card/60 border-border/40"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4 text-yellow-500" />En attente</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{pendingDesigners.length}</div></CardContent></Card>
        <Card className="bg-card/60 border-border/40"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" />Vérifiés</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{verifiedDesigners.length}</div></CardContent></Card>
      </div>

      {pendingDesigners.length > 0 && (
        <Card className="mb-8 bg-card/60 border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-yellow-500" />Demandes en attente ({pendingDesigners.length})</CardTitle>
            <CardDescription>Ces graphistes attendent la validation</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Bio</TableHead><TableHead>Portfolio</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {pendingDesigners.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.display_name}</TableCell>
                    <TableCell className="max-w-xs truncate">{d.bio || "-"}</TableCell>
                    <TableCell>{d.portfolio_url ? <a href={d.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3 w-3" />Voir</a> : "-"}</TableCell>
                    <TableCell>{new Date(d.created_at).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => toggleVerification(d.id, d.is_verified)}><CheckCircle className="h-4 w-4 mr-1" />Valider</Button>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/designer/${d.id}`)}>Profil</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card/60 border-border/40">
        <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" />Graphistes vérifiés ({verifiedDesigners.length})</CardTitle></CardHeader>
        <CardContent>
          {verifiedDesigners.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun graphiste vérifié</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Templates</TableHead><TableHead>Gains</TableHead><TableHead>Portfolio</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {verifiedDesigners.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium"><div className="flex items-center gap-2">{d.display_name}<Badge className="bg-green-500">Vérifié</Badge></div></TableCell>
                    <TableCell>{d.templates_count || 0}</TableCell>
                    <TableCell>{d.total_earnings?.toFixed(2) || "0.00"} €</TableCell>
                    <TableCell>{d.portfolio_url ? <a href={d.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3 w-3" />Voir</a> : "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/designer/${d.id}`)}>Profil</Button>
                        <Button size="sm" variant="destructive" onClick={() => toggleVerification(d.id, d.is_verified)}><XCircle className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
