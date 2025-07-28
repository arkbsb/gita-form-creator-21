import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  MoreVertical,
  Download,
  Users,
  Calendar,
  TrendingUp,
  Mail,
  FileText,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Sheet
} from "lucide-react";
import InviteManager from "@/components/InviteManager";
import { FolderSidebar } from "@/components/FolderSidebar";
import { FolderBreadcrumb } from "@/components/FolderBreadcrumb";
import { FormsDragDrop } from "@/components/FormsDragDrop";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useGoogleSheetsIntegration } from "@/hooks/useGoogleSheetsIntegration";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import logoGita from "@/assets/logo-gita.svg";

interface Form {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  webhook_url: string | null;
  folder_id: string | null;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  order_index: number;
}

interface Submission {
  id: string;
  submitted_at: string;
  submission_data: any;
  responses: FieldResponse[];
}

interface FieldResponse {
  field_id: string;
  value: string | null;
  field: FormField;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<Form[]>([]);
  const [formsLoading, setFormsLoading] = useState(true);
  
  // Estados para sistema de pastas
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [formCounts, setFormCounts] = useState<Record<string, number>>({});
  
  // Estados para visualização de dados
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { getSheetsStatus, recreateSpreadsheet } = useGoogleSheetsIntegration();

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
      fetchFolders();
    }
  }, [user]);

  useEffect(() => {
    updateFormCounts();
  }, [forms, folders]);

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

  const fetchFolders = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .eq("user_id", user.user.id)
        .order("order_index");

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error("Erro ao buscar pastas:", error);
    }
  };

  const updateFormCounts = () => {
    const counts: Record<string, number> = {};
    
    // Contar formulários na raiz
    counts['root'] = forms.filter(form => !form.folder_id).length;
    
    // Contar formulários em cada pasta
    folders.forEach(folder => {
      counts[folder.id] = forms.filter(form => form.folder_id === folder.id).length;
    });
    
    setFormCounts(counts);
  };

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    if (folderId) {
      const folder = folders.find(f => f.id === folderId);
      setSelectedFolderName(folder?.name || null);
    } else {
      setSelectedFolderName(null);
    }
  };

  const handleFormMove = async (formId: string, targetFolderId: string | null) => {
    try {
      const { error } = await supabase
        .from('forms')
        .update({ folder_id: targetFolderId })
        .eq('id', formId);

      if (error) throw error;

      fetchForms();
      toast({
        title: "Formulário movido!",
        description: targetFolderId 
          ? "Formulário movido para a pasta com sucesso."
          : "Formulário movido para a raiz com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao mover formulário:", error);
      toast({
        title: "Erro ao mover formulário",
        description: "Não foi possível mover o formulário.",
        variant: "destructive",
      });
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

  // Função para carregar dados do formulário selecionado
  const loadFormData = async (formId: string) => {
    try {
      setSubmissionsLoading(true);
      
      const form = forms.find(f => f.id === formId);
      setSelectedForm(form || null);

      const { data: fieldsData, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formId)
        .order('order_index');

      if (fieldsError) throw fieldsError;
      setFields(fieldsData);

      const { data: submissionsData, error: submissionsError } = await supabase
        .from('form_submissions')
        .select(`
          id,
          submitted_at,
          submission_data
        `)
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Load field responses for each submission
      const submissionsWithResponses = await Promise.all(
        (submissionsData || []).map(async (submission) => {
          const { data: responses, error: responsesError } = await supabase
            .from('form_field_responses')
            .select(`
              field_id,
              value,
              form_fields (
                id,
                type,
                label,
                order_index
              )
            `)
            .eq('submission_id', submission.id);

          if (responsesError) {
            console.error('Error loading responses:', responsesError);
            return { ...submission, responses: [] };
          }

          return {
            ...submission,
            responses: responses.map(r => ({
              field_id: r.field_id,
              value: r.value,
              field: r.form_fields
            }))
          };
        })
      );

      setSubmissions(submissionsWithResponses);

    } catch (error) {
      console.error('Error loading form data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do formulário.",
        variant: "destructive",
      });
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // Effect para carregar dados quando formulário é selecionado
  useEffect(() => {
    if (selectedFormId && forms.length > 0) {
      loadFormData(selectedFormId);
    } else {
      setSelectedForm(null);
      setFields([]);
      setSubmissions([]);
    }
  }, [selectedFormId, forms]);

  // Função para exportar CSV
  const exportToCSV = () => {
    if (submissions.length === 0) {
      toast({
        title: "Nenhuma resposta",
        description: "Não há respostas para exportar.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV header
    const headers = ['Data de Envio', ...fields.map(field => field.label)];
    
    // Create CSV rows
    const rows = submissions.map(submission => {
      const row = [new Date(submission.submitted_at).toLocaleString('pt-BR')];
      
      fields.forEach(field => {
        const response = submission.responses.find(r => r.field_id === field.id);
        row.push(response?.value || '');
      });
      
      return row;
    });

    // Convert to CSV
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedForm?.title || 'formulario'}_respostas.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Arquivo exportado!",
      description: "As respostas foram exportadas em formato CSV.",
    });
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
              <img src={logoGita} alt="Gita" className="h-12 w-auto" />
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

        {/* Tabs for Forms and Data Visualization */}
        <Tabs defaultValue="forms" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="forms" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Gerenciar Formulários
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Visualizar Dados
            </TabsTrigger>
            <TabsTrigger value="invites" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Gerenciar Convites
            </TabsTrigger>
          </TabsList>

          {/* Forms Management Tab */}
          <TabsContent value="forms">
            <div className="flex h-[800px] border border-form-field-border rounded-lg bg-gradient-to-br from-card to-form-field-bg">
              {/* Sidebar */}
              <FolderSidebar
                selectedFolderId={selectedFolderId}
                onFolderSelect={handleFolderSelect}
                onFolderUpdate={fetchFolders}
                formCounts={formCounts}
              />

              {/* Main Content */}
              <div className="flex-1 p-6 overflow-auto">
                <div className="space-y-6">
                  {/* Breadcrumb */}
                  <FolderBreadcrumb selectedFolderName={selectedFolderName} />

                  {/* Content */}
                  {formsLoading ? (
                    <div className="text-center py-12">
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
                    <FormsDragDrop
                      forms={forms}
                      onFormMove={handleFormMove}
                      onEditForm={(formId) => navigate(`/edit-form/${formId}`)}
                      onViewAnalytics={(formId) => navigate(`/form-analytics/${formId}`)}
                      onDeleteForm={handleDeleteForm}
                      onCopyLink={copyFormLink}
                      selectedFolderId={selectedFolderId}
                    />
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Data Visualization Tab */}
          <TabsContent value="data">
            <div className="space-y-6">
              {/* Form Selector */}
              <Card className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
                <CardHeader>
                  <CardTitle>Visualizar Dados do Formulário</CardTitle>
                  <CardDescription>
                    Selecione um formulário para visualizar suas respostas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                      <SelectTrigger className="w-[300px]">
                        <SelectValue placeholder="Selecione um formulário" />
                      </SelectTrigger>
                      <SelectContent>
                        {forms.map((form) => (
                          <SelectItem key={form.id} value={form.id}>
                            {form.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedFormId && submissions.length > 0 && (
                      <Button onClick={exportToCSV}>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar CSV
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Form Data Display */}
              {selectedFormId ? (
                submissionsLoading ? (
                  <Card className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
                    <CardContent className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Carregando dados...</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Stats for Selected Form */}
                    <div className="grid md:grid-cols-4 gap-6">
                      <Card className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total de Respostas</CardTitle>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{submissions.length}</div>
                          <p className="text-xs text-muted-foreground">
                            {selectedForm?.is_published ? 'Formulário ativo' : 'Rascunho'}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Campos do Formulário</CardTitle>
                          <FormInput className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{fields.length}</div>
                          <p className="text-xs text-muted-foreground">
                            Perguntas configuradas
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Última Resposta</CardTitle>
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {submissions.length > 0 
                              ? new Date(submissions[0].submitted_at).toLocaleDateString('pt-BR')
                              : 'N/A'
                            }
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Data mais recente
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Taxa de Preenchimento</CardTitle>
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {fields.length > 0 && submissions.length > 0
                              ? Math.round(
                                  fields.reduce((sum, field) => {
                                    const responses = submissions.flatMap(s => 
                                      s.responses.filter(r => r.field_id === field.id && r.value)
                                    );
                                    const responseRate = submissions.length > 0 ? (responses.length / submissions.length) * 100 : 0;
                                    return sum + responseRate;
                                  }, 0) / fields.length
                                )
                              : 0
                            }%
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Média de campos preenchidos
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Responses Table */}
                    <Card className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
                      <CardHeader>
                        <CardTitle>Respostas de "{selectedForm?.title}"</CardTitle>
                        <CardDescription>
                          Todas as submissões do formulário selecionado
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {submissions.length === 0 ? (
                          <div className="text-center py-12">
                            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Nenhuma resposta ainda</h3>
                            <p className="text-muted-foreground">
                              Quando alguém responder este formulário, as respostas aparecerão aqui.
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Data/Hora</TableHead>
                                  {fields.map(field => (
                                    <TableHead key={field.id}>{field.label}</TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {submissions.map(submission => (
                                  <TableRow key={submission.id}>
                                    <TableCell className="font-medium">
                                      {new Date(submission.submitted_at).toLocaleString('pt-BR')}
                                    </TableCell>
                                    {fields.map(field => {
                                      const response = submission.responses.find(r => r.field_id === field.id);
                                      return (
                                        <TableCell key={field.id}>
                                          {response?.value || '-'}
                                        </TableCell>
                                      );
                                    })}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )
              ) : (
                <Card className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
                  <CardContent className="text-center py-12">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Selecione um formulário</h3>
                    <p className="text-muted-foreground">
                      Escolha um formulário acima para visualizar suas respostas e estatísticas.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Invites Management Tab */}
          <TabsContent value="invites" className="space-y-6">
            <InviteManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;