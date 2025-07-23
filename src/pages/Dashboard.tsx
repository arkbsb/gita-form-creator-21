import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getFormUrl } from "@/lib/url";
import { 
  Plus, 
  FormInput, 
  BarChart3, 
  Settings, 
  ExternalLink,
  Edit3,
  Trash2,
  Copy,
  MoreVertical
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Form {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<Form[]>([]);
  const [formsLoading, setFormsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Redirect unauthenticated users to auth page
        if (!session?.user) {
          navigate('/auth');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session?.user) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchForms();
    }
  }, [user]);

  const fetchForms = async () => {
    try {
      setFormsLoading(true);
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching forms:', error);
        toast({
          title: "Erro ao carregar formulários",
          description: "Não foi possível carregar seus formulários.",
          variant: "destructive",
        });
      } else {
        setForms(data || []);
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setFormsLoading(false);
    }
  };

  const copyFormLink = (slug: string) => {
    const formUrl = getFormUrl(slug);
    navigator.clipboard.writeText(formUrl);
    toast({
      title: "Link copiado!",
      description: "O link do formulário foi copiado para a área de transferência.",
    });
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm("Tem certeza que deseja excluir este formulário? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', formId);

      if (error) {
        toast({
          title: "Erro ao excluir",
          description: "Não foi possível excluir o formulário.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Formulário excluído",
          description: "O formulário foi excluído com sucesso.",
        });
        fetchForms(); // Refresh the list
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao excluir o formulário.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-form-builder-bg to-accent/20">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-light rounded-lg flex items-center justify-center">
                <FormInput className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
                Gita Responses
              </span>
            </div>
            <Badge variant="secondary">Dashboard</Badge>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Bem-vindo, {user?.user_metadata?.full_name || user?.email}
            </span>
            <Button 
              variant="outline" 
              onClick={async () => {
                await supabase.auth.signOut();
                toast({ title: "Logout realizado com sucesso!" });
              }}
            >
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Meus Formulários</h1>
            <p className="text-muted-foreground">
              Gerencie e analise seus formulários criados
            </p>
          </div>
          <Button 
            onClick={() => navigate('/create-form')}
            className="bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Formulário
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Formulários</CardTitle>
              <FormInput className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{forms.length}</div>
              <p className="text-xs text-muted-foreground">
                {forms.filter(f => f.is_published).length} publicados
              </p>
            </CardContent>
          </Card>

          <Card className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Respostas Totais</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                +0 este mês
              </p>
            </CardContent>
          </Card>

          <Card className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0%</div>
              <p className="text-xs text-muted-foreground">
                Média geral
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Forms List */}
        <Card className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
          <CardHeader>
            <CardTitle>Seus Formulários</CardTitle>
            <CardDescription>
              Gerencie, edite e analise suas criações
            </CardDescription>
          </CardHeader>
          <CardContent>
            {formsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando formulários...</p>
              </div>
            ) : forms.length === 0 ? (
              <div className="text-center py-12">
                <FormInput className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum formulário encontrado</h3>
                <p className="text-muted-foreground mb-6">
                  Comece criando seu primeiro formulário
                </p>
                <Button 
                  onClick={() => navigate('/create-form')}
                  className="bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Formulário
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {forms.map((form) => (
                  <div 
                    key={form.id}
                    className="border border-form-field-border rounded-lg p-4 hover:border-primary/50 transition-all duration-300 bg-gradient-to-r from-form-field-bg to-form-field-hover"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">{form.title}</h3>
                          <Badge variant={form.is_published ? "default" : "secondary"}>
                            {form.is_published ? "Publicado" : "Rascunho"}
                          </Badge>
                        </div>
                        {form.description && (
                          <p className="text-muted-foreground mb-2">{form.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>
                            Criado em {new Date(form.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          <span>•</span>
                          <span>
                            Atualizado em {new Date(form.updated_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {form.is_published && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => copyFormLink(form.slug)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar Link
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/edit-form/${form.id}`)}>
                              <Edit3 className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/form-analytics/${form.id}`)}>
                              <BarChart3 className="w-4 h-4 mr-2" />
                              Respostas
                            </DropdownMenuItem>
                            {form.is_published && (
                              <DropdownMenuItem onClick={() => window.open(`/form/${form.slug}`, '_blank')}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDeleteForm(form.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;