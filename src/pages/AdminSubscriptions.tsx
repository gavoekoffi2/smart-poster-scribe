import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Users, Loader2, CreditCard, Gift, Search, DollarSign, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  credits_per_month: number;
  price_fcfa: number;
}

interface UserWithSubscription {
  user_id: string;
  full_name: string | null;
  email: string | null;
  company_name: string | null;
  created_at: string;
  plan_name: string | null;
  plan_slug: string | null;
  credits_remaining: number | null;
  free_generations_used: number | null;
  sub_status: string | null;
  current_period_end: string | null;
}

interface PaymentTransaction {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  amount_fcfa: number;
  amount_usd: number;
  status: string;
  payment_method: string | null;
  plan_name: string | null;
  created_at: string;
}

export default function AdminSubscriptions() {
  const { user } = useAuth();
  const { hasPermission } = useAdmin();
  
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserWithSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [customCredits, setCustomCredits] = useState("");
  const [durationMonths, setDurationMonths] = useState("1");
  const [isGranting, setIsGranting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [plansRes, usersRes, transRes] = await Promise.all([
        supabase.from("subscription_plans").select("id, name, slug, credits_per_month, price_fcfa").eq("is_active", true).order("sort_order"),
        supabase.rpc("admin_get_users_with_subscriptions", { p_admin_id: user!.id }),
        supabase.rpc("admin_get_payment_transactions", { p_admin_id: user!.id }),
      ]);
      
      if (plansRes.error) throw plansRes.error;
      if (usersRes.error) throw usersRes.error;
      if (transRes.error) throw transRes.error;
      
      setPlans(plansRes.data || []);
      setUsers((usersRes.data as any[]) || []);
      setTransactions((transRes.data as any[]) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleGrantSubscription = async () => {
    if (!selectedUser || !selectedPlan) {
      toast.error("Veuillez sélectionner un utilisateur et un plan");
      return;
    }
    setIsGranting(true);
    try {
      const { data, error } = await supabase.rpc("admin_grant_subscription", {
        p_admin_id: user?.id,
        p_target_user_id: selectedUser.user_id,
        p_plan_slug: selectedPlan,
        p_credits: customCredits ? parseInt(customCredits) : null,
        p_duration_months: parseInt(durationMonths),
      });
      if (error) throw error;
      const result = data as any;
      if (result.success) {
        toast.success(result.message);
        setDialogOpen(false);
        setSelectedUser(null);
        setSelectedPlan("");
        setCustomCredits("");
        setDurationMonths("1");
        fetchData();
      } else {
        toast.error(result.message || "Erreur lors de l'attribution");
      }
    } catch (error) {
      console.error("Error granting subscription:", error);
      toast.error("Erreur lors de l'attribution de l'abonnement");
    } finally {
      setIsGranting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchQuery || 
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.user_id.includes(searchQuery);
    const matchesPlan = planFilter === "all" || 
      (planFilter === "none" && !u.plan_slug) ||
      u.plan_slug === planFilter;
    return matchesSearch && matchesPlan;
  });

  // Stats
  const totalUsers = users.length;
  const freeUsers = users.filter(u => !u.plan_slug || u.plan_slug === "free").length;
  const paidUsers = users.filter(u => u.plan_slug && u.plan_slug !== "free").length;
  const noSubUsers = users.filter(u => !u.plan_slug).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Réussi</Badge>;
      case "failed": return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Échoué</Badge>;
      default: return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">En attente</Badge>;
    }
  };

  return (
    <AdminLayout requiredPermission="manage_users">
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-foreground">Gestion des abonnements</h2>
        <p className="text-muted-foreground">Gérez les utilisateurs, abonnements et transactions</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" />Utilisateurs ({totalUsers})</TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2"><CreditCard className="w-4 h-4" />Transactions ({transactions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-card/60 border-border/40">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{totalUsers}</div>
                  <p className="text-xs text-muted-foreground">Total utilisateurs</p>
                </CardContent>
              </Card>
              <Card className="bg-card/60 border-border/40">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-muted-foreground">{freeUsers}</div>
                  <p className="text-xs text-muted-foreground">Plan gratuit</p>
                </CardContent>
              </Card>
              <Card className="bg-card/60 border-border/40">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-primary">{paidUsers}</div>
                  <p className="text-xs text-muted-foreground">Plans payants</p>
                </CardContent>
              </Card>
              <Card className="bg-card/60 border-border/40">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-yellow-500">{noSubUsers}</div>
                  <p className="text-xs text-muted-foreground">Sans abonnement</p>
                </CardContent>
              </Card>
            </div>

            {/* Search + Filter */}
            <Card className="bg-card/60 border-border/40 mb-6">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Rechercher par nom ou email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                  </div>
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filtrer par plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les plans</SelectItem>
                      <SelectItem value="none">Sans abonnement</SelectItem>
                      {plans.map(p => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="bg-card/60 border-border/40">
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Crédits</TableHead>
                      <TableHead>Expire le</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun utilisateur trouvé</TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((u) => (
                        <TableRow key={u.user_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{u.full_name || "Sans nom"}</p>
                              <p className="text-xs text-muted-foreground">{u.email || u.user_id.substring(0, 16) + "..."}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.plan_slug && u.plan_slug !== "free" ? "default" : "secondary"} className={u.plan_slug && u.plan_slug !== "free" ? "bg-primary/20 text-primary" : ""}>
                              {u.plan_name || "Aucun"}
                            </Badge>
                          </TableCell>
                          <TableCell>{u.credits_remaining ?? 0}</TableCell>
                          <TableCell>
                            {u.current_period_end ? new Date(u.current_period_end).toLocaleDateString("fr-FR") : "-"}
                          </TableCell>
                          <TableCell>
                            {u.sub_status ? (
                              <Badge className={u.sub_status === "active" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}>
                                {u.sub_status === "active" ? "Actif" : u.sub_status === "expired" ? "Expiré" : u.sub_status}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog open={dialogOpen && selectedUser?.user_id === u.user_id} onOpenChange={(open) => { setDialogOpen(open); if (!open) setSelectedUser(null); }}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setSelectedUser(u)}>
                                  <Gift className="w-4 h-4 mr-2" />Offrir
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Attribuer un abonnement</DialogTitle>
                                  <DialogDescription>Offrez un plan à {u.full_name || u.email || "cet utilisateur"}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Plan</Label>
                                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                                      <SelectTrigger><SelectValue placeholder="Sélectionner un plan" /></SelectTrigger>
                                      <SelectContent>
                                        {plans.filter(p => p.slug !== "free").map(p => <SelectItem key={p.id} value={p.slug}>{p.name} ({p.credits_per_month} crédits)</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Crédits personnalisés (optionnel)</Label>
                                    <Input type="number" placeholder="Crédits du plan par défaut" value={customCredits} onChange={(e) => setCustomCredits(e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Durée (mois)</Label>
                                    <Select value={durationMonths} onValueChange={setDurationMonths}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="1">1 mois</SelectItem>
                                        <SelectItem value="3">3 mois</SelectItem>
                                        <SelectItem value="6">6 mois</SelectItem>
                                        <SelectItem value="12">12 mois</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                                  <Button onClick={handleGrantSubscription} disabled={isGranting || !selectedPlan} className="bg-gradient-to-r from-primary to-accent">
                                    {isGranting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Gift className="w-4 h-4 mr-2" />}
                                    Attribuer
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card className="bg-card/60 border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Historique des transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Aucune transaction enregistrée</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Méthode</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-sm">{new Date(tx.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{tx.user_name || "Inconnu"}</p>
                              <p className="text-xs text-muted-foreground">{tx.user_email || "-"}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{tx.plan_name || "-"}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">${tx.amount_usd}</p>
                              <p className="text-xs text-muted-foreground">{tx.amount_fcfa.toLocaleString()} FCFA</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{tx.payment_method || "-"}</TableCell>
                          <TableCell>{getStatusBadge(tx.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </AdminLayout>
  );
}
