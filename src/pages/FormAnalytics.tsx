import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  Download, 
  BarChart3, 
  Users, 
  Calendar,
  TrendingUp,
  FormInput,
  Eye,
  Share2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useParams } from "react-router-dom";

interface FormData {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  is_published: boolean;
  created_at: string;
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

const FormAnalytics = () => {
  const { formId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormData | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (!session?.user) {
          navigate('/auth');
        }
      }
    );

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
    if (user && formId) {
      loadFormData();
      loadSubmissions();
    }
  }, [user, formId]);

  const loadFormData = async () => {
    try {
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (formError) throw formError;
      setForm(formData);

      const { data: fieldsData, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formId)
        .order('order_index');

      if (fieldsError) throw fieldsError;
      setFields(fieldsData);

    } catch (error) {
      console.error('Error loading form:', error);
      toast({
        title: "Erro ao carregar formulário",
        description: "Não foi possível carregar os dados do formulário.",
        variant: "destructive",
      });
      navigate('/dashboard');
    }
  };

  const loadSubmissions = async () => {
    try {
      setSubmissionsLoading(true);
      
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
      console.error('Error loading submissions:', error);
      toast({
        title: "Erro ao carregar respostas",
        description: "Não foi possível carregar as respostas do formulário.",
        variant: "destructive",
      });
    } finally {
      setSubmissionsLoading(false);
    }
  };

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
    link.setAttribute('download', `${form?.title || 'formulario'}_respostas.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Arquivo exportado!",
      description: "As respostas foram exportadas em formato CSV.",
    });
  };

  const copyFormLink = () => {
    if (form?.slug) {
      const formUrl = `${window.location.origin}/form/${form.slug}`;
      navigator.clipboard.writeText(formUrl);
      toast({
        title: "Link copiado!",
        description: "O link do formulário foi copiado para a área de transferência.",
      });
    }
  };

  const getFieldStats = (field: FormField) => {
    const responses = submissions.flatMap(s => 
      s.responses.filter(r => r.field_id === field.id && r.value)
    );
    
    const totalResponses = responses.length;
    const responseRate = submissions.length > 0 ? (totalResponses / submissions.length) * 100 : 0;

    // For select/radio/checkbox fields, count occurrences
    if (['select', 'radio', 'checkbox'].includes(field.type)) {
      const valueCounts: { [key: string]: number } = {};
      responses.forEach(response => {
        const values = response.value?.split(', ') || [];
        values.forEach(value => {
          valueCounts[value] = (valueCounts[value] || 0) + 1;
        });
      });

      return {
        totalResponses,
        responseRate,
        valueCounts,
        mostCommon: Object.entries(valueCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'
      };
    }

    return {
      totalResponses,
      responseRate,
      averageLength: responses.reduce((sum, r) => sum + (r.value?.length || 0), 0) / totalResponses || 0
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Formulário não encontrado</h2>
          <Button onClick={() => navigate('/dashboard')}>
            Voltar ao Dashboard
          </Button>
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
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-light rounded-lg flex items-center justify-center">
                <FormInput className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
                Gita Responses
              </span>
            </div>
            <Badge variant="secondary">Análise de Respostas</Badge>
          </div>
          <div className="flex items-center space-x-4">
            {form.is_published && (
              <>
                <Button 
                  variant="outline" 
                  onClick={copyFormLink}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartilhar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.open(`/form/${form.slug}`, '_blank')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Visualizar
                </Button>
              </>
            )}
            <Button 
              onClick={exportToCSV}
              disabled={submissions.length === 0}
              className="bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{form.title}</h1>
          <p className="text-muted-foreground">
            Análise detalhada das respostas recebidas
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Respostas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{submissions.length}</div>
              <p className="text-xs text-muted-foreground">
                {form.is_published ? 'Formulário ativo' : 'Rascunho'}
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
                      fields.reduce((sum, field) => 
                        sum + getFieldStats(field).responseRate, 0
                      ) / fields.length
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

        {/* Main Content */}
        <Tabs defaultValue="responses" className="space-y-6">
          <TabsList>
            <TabsTrigger value="responses">Respostas</TabsTrigger>
            <TabsTrigger value="analytics">Análise por Campo</TabsTrigger>
          </TabsList>

          <TabsContent value="responses">
            <Card className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
              <CardHeader>
                <CardTitle>Respostas Recebidas</CardTitle>
                <CardDescription>
                  Todas as submissões do formulário em ordem cronológica
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submissionsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Carregando respostas...</p>
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhuma resposta ainda</h3>
                    <p className="text-muted-foreground mb-6">
                      Quando alguém responder seu formulário, as respostas aparecerão aqui.
                    </p>
                    {form.is_published && (
                      <Button onClick={copyFormLink}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Compartilhar Formulário
                      </Button>
                    )}
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
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-6">
              {fields.map(field => {
                const stats = getFieldStats(field);
                
                return (
                  <Card key={field.id} className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{field.label}</CardTitle>
                          <CardDescription>Tipo: {field.type}</CardDescription>
                        </div>
                        <Badge variant="outline">
                          {stats.totalResponses} respostas
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium">Taxa de Resposta</p>
                          <p className="text-2xl font-bold">{Math.round(stats.responseRate)}%</p>
                        </div>
                        
                        {['select', 'radio', 'checkbox'].includes(field.type) ? (
                          <>
                            <div>
                              <p className="text-sm font-medium">Opção Mais Escolhida</p>
                              <p className="text-lg font-semibold">{stats.mostCommon}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Distribuição</p>
                              <div className="space-y-1">
                                {Object.entries(stats.valueCounts || {}).map(([value, count]) => (
                                  <div key={value} className="flex justify-between text-sm">
                                    <span className="truncate">{value}</span>
                                    <span>{count}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div>
                            <p className="text-sm font-medium">Comprimento Médio</p>
                            <p className="text-2xl font-bold">
                              {Math.round(stats.averageLength || 0)} chars
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {fields.length === 0 && (
                <Card className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
                  <CardContent className="text-center py-12">
                    <FormInput className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum campo encontrado</h3>
                    <p className="text-muted-foreground mb-6">
                      Este formulário ainda não possui campos configurados.
                    </p>
                    <Button onClick={() => navigate(`/edit-form/${formId}`)}>
                      Editar Formulário
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default FormAnalytics;