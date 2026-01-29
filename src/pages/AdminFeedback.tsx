import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Star,
  Loader2,
  ChevronLeft,
  User,
  Image as ImageIcon,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface FeedbackItem {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string | null;
  image_id: string | null;
  user_email?: string;
  user_name?: string;
  image_url?: string;
}

export default function AdminFeedback() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { userRole, isLoading: roleLoading, hasPermission } = useAdmin();
  
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    averageRating: 0,
    positiveCount: 0,
    negativeCount: 0,
  });

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate("/auth", { state: { redirectTo: "/admin/feedback" } });
        return;
      }
      
      if (!userRole || !hasPermission('view_dashboard')) {
        toast.error("Accès refusé - Vous n'avez pas les permissions nécessaires");
        navigate("/");
        return;
      }
      
      fetchFeedbacks();
    }
  }, [user, authLoading, roleLoading, userRole, navigate, hasPermission]);

  const fetchFeedbacks = async () => {
    setIsLoading(true);
    try {
      // Fetch feedbacks with related data
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("generation_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (feedbackError) throw feedbackError;

      // Enrich with user and image info
      const enrichedFeedbacks: FeedbackItem[] = [];
      
      for (const feedback of feedbackData || []) {
        let enriched: FeedbackItem = { ...feedback };
        
        // Get user info if available
        if (feedback.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", feedback.user_id)
            .maybeSingle();
          
          if (profile) {
            enriched.user_name = profile.full_name || "Utilisateur";
          }
        }
        
        // Get image info if available
        if (feedback.image_id) {
          const { data: image } = await supabase
            .from("generated_images")
            .select("image_url")
            .eq("id", feedback.image_id)
            .maybeSingle();
          
          if (image) {
            enriched.image_url = image.image_url;
          }
        }
        
        enrichedFeedbacks.push(enriched);
      }

      setFeedbacks(enrichedFeedbacks);
      
      // Calculate stats
      if (enrichedFeedbacks.length > 0) {
        const total = enrichedFeedbacks.length;
        const sum = enrichedFeedbacks.reduce((acc, f) => acc + f.rating, 0);
        const positiveCount = enrichedFeedbacks.filter(f => f.rating >= 4).length;
        const negativeCount = enrichedFeedbacks.filter(f => f.rating <= 2).length;
        
        setStats({
          total,
          averageRating: Math.round((sum / total) * 10) / 10,
          positiveCount,
          negativeCount,
        });
      }
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
      toast.error("Erreur lors du chargement des feedbacks");
    } finally {
      setIsLoading(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-500";
    if (rating >= 3) return "text-yellow-500";
    return "text-red-500";
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 4) return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Positif</Badge>;
    if (rating >= 3) return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Neutre</Badge>;
    return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Négatif</Badge>;
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userRole || !hasPermission('view_dashboard')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/dashboard")}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-display font-bold text-foreground">
                Feedback Utilisateurs
              </h1>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFeedbacks}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card/60 border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Feedbacks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Note Moyenne
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground flex items-center gap-2">
                {stats.averageRating}
                <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avis Positifs (4-5★)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{stats.positiveCount}</div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avis Négatifs (1-2★)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">{stats.negativeCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Feedbacks Table */}
        <Card className="bg-card/60 border-border/40">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">
              Tous les Feedbacks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun feedback reçu pour le moment</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Commentaire</TableHead>
                    <TableHead>Image</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbacks.map((feedback) => (
                    <TableRow key={feedback.id}>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(feedback.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{feedback.user_name || "Anonyme"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 font-bold ${getRatingColor(feedback.rating)}`}>
                          {feedback.rating}
                          <Star className="w-4 h-4 fill-current" />
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRatingBadge(feedback.rating)}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        {feedback.comment ? (
                          <p className="text-sm text-foreground truncate" title={feedback.comment}>
                            {feedback.comment}
                          </p>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">
                            Aucun commentaire
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {feedback.image_url ? (
                          <a
                            href={feedback.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-primary hover:underline"
                          >
                            <ImageIcon className="w-4 h-4" />
                            <span className="text-sm">Voir</span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
