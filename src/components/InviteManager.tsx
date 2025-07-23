import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plus, Trash2 } from "lucide-react";
import { getAppUrl } from "@/lib/url";

interface Invitation {
  id: string;
  created_by: string;
  email?: string;
  token: string;
  expires_at: string;
  used_at?: string;
  used_by?: string;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

const InviteManager = () => {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    description: "",
    expires_in_days: "7",
    max_uses: "1"
  });

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      // Simular busca por convites - implementar após migração
      console.log("Buscando convites...");
      setInvitations([]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar convites",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Gerar token único temporário
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      // Calcular data de expiração
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(formData.expires_in_days));

      // Simular criação de convite
      console.log("Criando convite:", {
        email: formData.email || null,
        token: token,
        expires_at: expiresAt.toISOString(),
        max_uses: parseInt(formData.max_uses),
        description: formData.description || null
      });

      // Gerar e copiar link do convite
      const inviteUrl = getAppUrl(`/auth?invite=${token}`);
      await navigator.clipboard.writeText(inviteUrl);

      toast({
        title: "Convite criado!",
        description: "Link copiado para a área de transferência. Funcionalidade será ativada após aplicar migrações.",
      });

      setDialogOpen(false);
      setFormData({
        email: "",
        description: "",
        expires_in_days: "7",
        max_uses: "1"
      });
      fetchInvitations();
    } catch (error: any) {
      toast({
        title: "Erro ao criar convite",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const copyInviteLink = async (token: string) => {
    const inviteUrl = getAppUrl(`/auth?invite=${token}`);
    await navigator.clipboard.writeText(inviteUrl);
    toast({
      title: "Link copiado!",
      description: "Link do convite copiado para a área de transferência.",
    });
  };

  const deactivateInvitation = async (id: string) => {
    try {
      // Simular desativação
      console.log("Desativando convite:", id);

      toast({
        title: "Convite desativado",
        description: "O convite foi desativado com sucesso. Funcionalidade será ativada após aplicar migrações.",
      });

      fetchInvitations();
    } catch (error: any) {
      toast({
        title: "Erro ao desativar convite",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getInviteStatus = (invite: Invitation) => {
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    
    if (!invite.is_active) return { text: "Desativado", variant: "secondary" as const };
    if (expiresAt < now) return { text: "Expirado", variant: "destructive" as const };
    if (invite.current_uses >= invite.max_uses) return { text: "Esgotado", variant: "destructive" as const };
    if (invite.used_at) return { text: "Usado", variant: "outline" as const };
    return { text: "Ativo", variant: "default" as const };
  };

  if (loading) {
    return <div className="p-4">Carregando convites...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Gerenciar Convites</h2>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Criar Convite
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Novo Convite</DialogTitle>
            </DialogHeader>
            <form onSubmit={createInvitation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email (Opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (Opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Descrição do convite..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expires_in_days">Expira em</Label>
                  <Select 
                    value={formData.expires_in_days} 
                    onValueChange={(value) => setFormData({...formData, expires_in_days: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 dia</SelectItem>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="90">90 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_uses">Máximo de usos</Label>
                  <Select 
                    value={formData.max_uses} 
                    onValueChange={(value) => setFormData({...formData, max_uses: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 uso</SelectItem>
                      <SelectItem value="5">5 usos</SelectItem>
                      <SelectItem value="10">10 usos</SelectItem>
                      <SelectItem value="999">Ilimitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Criando..." : "Criar Convite"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Convites</CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum convite criado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email/Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invite) => {
                  const status = getInviteStatus(invite);
                  return (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div>
                          {invite.email && <div className="font-medium">{invite.email}</div>}
                          {invite.description && (
                            <div className="text-sm text-muted-foreground">{invite.description}</div>
                          )}
                          {!invite.email && !invite.description && (
                            <div className="text-sm text-muted-foreground">Convite geral</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.text}</Badge>
                      </TableCell>
                      <TableCell>
                        {invite.current_uses}/{invite.max_uses === 999 ? "∞" : invite.max_uses}
                      </TableCell>
                      <TableCell>
                        {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        {new Date(invite.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyInviteLink(invite.token)}
                            disabled={!invite.is_active || new Date(invite.expires_at) < new Date()}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          
                          {invite.is_active && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deactivateInvitation(invite.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteManager;