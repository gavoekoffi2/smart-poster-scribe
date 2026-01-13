import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  Users,
  Image,
  Palette,
  LogOut,
  ChevronRight,
  Loader2,
  Shield,
  Crown,
  UserCog,
  CreditCard,
  Gift,
  Search,
} from "lucide-react";
import { toast } from "sonner";

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  credits_per_month: number;
  price_fcfa: number;
}

interface UserWithSubscription {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  plan_name: string | null;
  plan_slug: string | null;
  credits_remaining: number;
  current_period_end: string | null;
  status: string | null;
}

export default function AdminSubscriptions() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { userRole, isLoading: roleLoading, hasPermission, getRoleLabel, isSuperAdmin, isAdmin } = useAdmin();
  
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [customCredits, setCustomCredits] = useState("");
  const [durationMonths, setDurationMonths] = useState("1");
  const [isGranting, setIsGranting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate("/auth", { state: { redirectTo: "/admin/subscriptions" } });
        return;
      }
      
      if (!userRole || !hasPermission('manage_users')) {
        toast.error("Accès refusé - Vous n'avez pas les permissions nécessaires");
        navigate("/");
        return;
      }
      
      fetchData();
    }
  }, [user, authLoading, roleLoading, userRole, navigate, hasPermission]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch plans
      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("id, name, slug, credits_per_month, price_fcfa")
        .eq("is_active", true)
        .order("sort_order");
      
      if (plansError) throw plansError;
      setPlans(plansData || []);
      
      // Fetch users with their subscriptions
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name")
        .order("created_at", { ascending: false });
      
      if (profilesError) throw profilesError;
      
      // Get user emails from auth (we'll use user_id for now)
      const usersWithSubs: UserWithSubscription[] = [];
      
      for (const profile of profilesData || []) {
        // Get subscription for this user
        const { data: subData } = await supabase
          .from("user_subscriptions")
          .select(`
            credits_remaining,
            current_period_end,
            status,
            plan:subscription_plans(name, slug)
          `)
          .eq("user_id", profile.user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        usersWithSubs.push({
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: profile.user_id.substring(0, 8) + "...", // Placeholder for email
          plan_name: (subData?.plan as any)?.name || "Aucun",
          plan_slug: (subData?.plan as any)?.slug || null,
          credits_remaining: subData?.credits_remaining || 0,
          current_period_end: subData?.current_period_end || null,
          status: subData?.status || null,
        });
      }
      
      setUsers(usersWithSubs);
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
        fetchData(); // Refresh the list
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const filteredUsers = users.filter(u => 
    (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    u.user_id.includes(searchQuery)
  );

  if (authLoading || roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userRole || !hasPermission('manage_users')) {
    return null;
  }

  const getRoleIcon = () => {
    if (isSuperAdmin) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (isAdmin) return <Shield className="w-4 h-4 text-primary" />;
    return <UserCog className="w-4 h-4 text-muted-foreground" />;
  };

  const navItems = [
    { id: 'dashboard', label: "Vue d'ensemble", icon: LayoutDashboard, path: '/admin/dashboard' },
    { id: 'templates', label: "Templates", icon: Image, path: '/admin/templates' },
    { id: 'subscriptions', label: "Abonnements", icon: CreditCard, path: '/admin/subscriptions' },
    { id: 'designers', label: "Graphistes", icon: Palette, path: '/admin/designers' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            {getRoleIcon()}
          </div>
          <div>
            <h1 className="font-display font-bold text-foreground">Admin</h1>
            <p className="text-xs text-muted-foreground">{getRoleLabel(userRole)}</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = item.id === 'subscriptions';
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={`w-full justify-start gap-3 ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => navigate(item.path)}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        <div className="space-y-2 pt-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/")}
          >
            <ChevronRight className="w-4 h-4" />
            Retour au site
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground">
              Gestion des abonnements
            </h2>
            <p className="text-muted-foreground">
              Attribuez des plans d'abonnement aux utilisateurs
            </p>
          </div>
        </div>

        {/* Plans Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {plans.map(plan => (
            <Card key={plan.id} className="bg-card/60 border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {plan.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{plan.credits_per_month}</div>
                <p className="text-xs text-muted-foreground">crédits/mois</p>
                {plan.price_fcfa > 0 && (
                  <p className="text-xs text-primary mt-1">{plan.price_fcfa.toLocaleString()} FCFA</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Actions */}
        <Card className="bg-card/60 border-border/40 mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un utilisateur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-card/60 border-border/40">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
              <Users className="w-5 h-5" />
              Utilisateurs ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Plan actuel</TableHead>
                  <TableHead>Crédits restants</TableHead>
                  <TableHead>Expire le</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Aucun utilisateur trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((userItem) => (
                    <TableRow key={userItem.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{userItem.full_name || "Sans nom"}</p>
                          <p className="text-xs text-muted-foreground">{userItem.user_id.substring(0, 16)}...</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          userItem.plan_slug === 'enterprise' ? 'bg-yellow-500/10 text-yellow-500' :
                          userItem.plan_slug === 'business' ? 'bg-primary/10 text-primary' :
                          userItem.plan_slug === 'pro' ? 'bg-accent/10 text-accent' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {userItem.plan_name || "Aucun"}
                        </span>
                      </TableCell>
                      <TableCell>{userItem.credits_remaining}</TableCell>
                      <TableCell>
                        {userItem.current_period_end 
                          ? new Date(userItem.current_period_end).toLocaleDateString("fr-FR")
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          userItem.status === 'active' ? 'bg-green-500/10 text-green-500' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {userItem.status || "Inactif"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog open={dialogOpen && selectedUser?.id === userItem.id} onOpenChange={(open) => {
                          setDialogOpen(open);
                          if (!open) setSelectedUser(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedUser(userItem)}
                            >
                              <Gift className="w-4 h-4 mr-2" />
                              Offrir
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Attribuer un abonnement</DialogTitle>
                              <DialogDescription>
                                Offrez un plan d'abonnement à {userItem.full_name || "cet utilisateur"}
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Plan d'abonnement</Label>
                                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un plan" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {plans.map(plan => (
                                      <SelectItem key={plan.id} value={plan.slug}>
                                        {plan.name} ({plan.credits_per_month} crédits)
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Crédits personnalisés (optionnel)</Label>
                                <Input
                                  type="number"
                                  placeholder="Laisser vide pour utiliser les crédits du plan"
                                  value={customCredits}
                                  onChange={(e) => setCustomCredits(e.target.value)}
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Durée (mois)</Label>
                                <Select value={durationMonths} onValueChange={setDurationMonths}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
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
                              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                Annuler
                              </Button>
                              <Button 
                                onClick={handleGrantSubscription}
                                disabled={isGranting || !selectedPlan}
                                className="bg-gradient-to-r from-primary to-accent"
                              >
                                {isGranting ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                  <Gift className="w-4 h-4 mr-2" />
                                )}
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
      </div>
    </div>
  );
}
