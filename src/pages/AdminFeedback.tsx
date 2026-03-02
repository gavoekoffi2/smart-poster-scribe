import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Star, Loader2, User, Image as ImageIcon, Calendar, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";

interface FeedbackItem {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string | null;
  image_id: string | null;
  user_name?: string;
  image_url?: string;
}

export default function AdminFeedback() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, averageRating: 0, positiveCount: 0, negativeCount: 0 });

  useEffect(() => { if (user) fetchFeedbacks(); }, [user]);

  const fetchFeedbacks = async () => {
    setIsLoading(true);
    try {
      const { data: feedbackData, error } = await supabase
        .from("generation_feedback").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;

      const enriched: FeedbackItem[] = [];
      for (const fb of feedbackData || []) {
        let item: FeedbackItem = { ...fb };
        if (fb.user_id) {
          const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", fb.user_id).maybeSingle();
          if (profile) item.user_name = profile.full_name || "Utilisateur";
        }
        if (fb.image_id) {
          const { data: image } = await supabase.from("generated_images").select("image_url").eq("id", fb.image_id).maybeSingle();
          if (image) item.image_url = image.image_url;
        }
        enriched.push(item);
      }
      setFeedbacks(enriched);
      if (enriched.length > 0) {
        const sum = enriched.reduce((a, f) => a + f.rating, 0);
        setStats({
          total: enriched.length,
          averageRating: Math.round((sum / enriched.length) * 10) / 10,
          positiveCount: enriched.filter(f => f.rating >= 4).length,
          negativeCount: enriched.filter(f => f.rating <= 2).length,
        });
      }
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setIsLoading(false);
    }
  };

  const getRatingColor = (r: number) => r >= 4 ? "text-green-500" : r >= 3 ? "text-yellow-500" : "text-red-500";
  const getRatingBadge = (r: number) => {
    if (r >= 4) return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Positif</Badge>;
    if (r >= 3) return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Neutre</Badge>;
    return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Négatif</Badge>;
  };

  return (
    <AdminLayout requiredPermission="view_dashboard">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-primary" />Feedback Utilisateurs
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={fetchFeedbacks} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card/60 border-border/40"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.total}</div></CardContent></Card>
        <Card className="bg-card/60 border-border/40"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Note Moyenne</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold flex items-center gap-2">{stats.averageRating}<Star className="w-6 h-6 text-yellow-500 fill-yellow-500" /></div></CardContent></Card>
        <Card className="bg-card/60 border-border/40"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Positifs (4-5★)</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-green-500">{stats.positiveCount}</div></CardContent></Card>
        <Card className="bg-card/60 border-border/40"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Négatifs (1-2★)</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-500">{stats.negativeCount}</div></CardContent></Card>
      </div>

      <Card className="bg-card/60 border-border/40">
        <CardHeader><CardTitle className="text-lg">Tous les Feedbacks</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>Aucun feedback</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead><TableHead>Utilisateur</TableHead><TableHead>Note</TableHead><TableHead>Statut</TableHead><TableHead>Commentaire</TableHead><TableHead>Image</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbacks.map((fb) => (
                  <TableRow key={fb.id}>
                    <TableCell className="text-muted-foreground"><div className="flex items-center gap-2"><Calendar className="w-4 h-4" />{new Date(fb.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</div></TableCell>
                    <TableCell><div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" />{fb.user_name || "Anonyme"}</div></TableCell>
                    <TableCell><div className={`flex items-center gap-1 font-bold ${getRatingColor(fb.rating)}`}>{fb.rating}<Star className="w-4 h-4 fill-current" /></div></TableCell>
                    <TableCell>{getRatingBadge(fb.rating)}</TableCell>
                    <TableCell className="max-w-[300px]">{fb.comment ? <p className="text-sm truncate" title={fb.comment}>{fb.comment}</p> : <span className="text-muted-foreground text-sm italic">—</span>}</TableCell>
                    <TableCell>{fb.image_url ? <a href={fb.image_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline"><ImageIcon className="w-4 h-4" />Voir</a> : <span className="text-muted-foreground">-</span>}</TableCell>
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
