import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, DollarSign, TrendingUp, Loader2, Search, Link2 } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";

interface AffiliateData {
  id: string;
  user_id: string;
  referral_code: string;
  total_referrals: number;
  total_earnings: number;
  is_active: boolean;
  created_at: string;
}

interface CommissionData {
  id: string;
  affiliate_id: string;
  amount: number;
  commission_rate: number;
  status: string;
  created_at: string;
}

export default function AdminAffiliates() {
  const { user } = useAuth();
  const [affiliates, setAffiliates] = useState<AffiliateData[]>([]);
  const [commissions, setCommissions] = useState<CommissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [affRes, comRes] = await Promise.all([
        supabase.from("affiliates").select("*").order("created_at", { ascending: false }),
        supabase.from("referral_commissions").select("*").order("created_at", { ascending: false }),
      ]);
      if (affRes.error) throw affRes.error;
      if (comRes.error) throw comRes.error;
      setAffiliates(affRes.data || []);
      setCommissions(comRes.data || []);
    } catch (error) {
      console.error("Error fetching affiliates:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const totalEarnings = affiliates.reduce((sum, a) => sum + Number(a.total_earnings), 0);
  const totalReferrals = affiliates.reduce((sum, a) => sum + a.total_referrals, 0);
  const pendingCommissions = commissions.filter(c => c.status === "pending").reduce((sum, c) => sum + Number(c.amount), 0);

  const filteredAffiliates = affiliates.filter(a =>
    !searchQuery || a.referral_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout requiredPermission="manage_users">
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Link2 className="w-8 h-8 text-primary" />Programme d'affiliation
        </h2>
        <p className="text-muted-foreground">Suivez les affiliés, filleuls et commissions</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-card/60 border-border/40">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Affiliés</span>
                </div>
                <div className="text-3xl font-bold">{affiliates.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-border/40">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Filleuls totaux</span>
                </div>
                <div className="text-3xl font-bold">{totalReferrals}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-border/40">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-muted-foreground">Commissions totales</span>
                </div>
                <div className="text-3xl font-bold text-green-500">${totalEarnings.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-border/40">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm text-muted-foreground">En attente</span>
                </div>
                <div className="text-3xl font-bold text-yellow-500">${pendingCommissions.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="bg-card/60 border-border/40 mb-6">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Rechercher par code de parrainage..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
            </CardContent>
          </Card>

          {/* Affiliates Table */}
          <Card className="bg-card/60 border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5" />Affiliés ({filteredAffiliates.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Filleuls</TableHead>
                    <TableHead>Gains</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Inscription</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAffiliates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucun affilié</TableCell>
                    </TableRow>
                  ) : (
                    filteredAffiliates.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-sm font-medium">{a.referral_code}</TableCell>
                        <TableCell>{a.total_referrals}</TableCell>
                        <TableCell className="text-green-500 font-medium">${Number(a.total_earnings).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={a.is_active ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}>
                            {a.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(a.created_at).toLocaleDateString("fr-FR")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Commissions */}
          {commissions.length > 0 && (
            <Card className="bg-card/60 border-border/40 mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />Commissions récentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Taux</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.slice(0, 20).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm">{new Date(c.created_at).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell className="text-green-500 font-medium">${Number(c.amount).toFixed(2)}</TableCell>
                        <TableCell>{(c.commission_rate * 100).toFixed(0)}%</TableCell>
                        <TableCell>
                          <Badge className={c.status === "paid" ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"}>
                            {c.status === "paid" ? "Payé" : "En attente"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </AdminLayout>
  );
}
