import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGoogleSheetsIntegration, FormQuestion } from "@/hooks/useGoogleSheetsIntegration";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  GripVertical, 
  Save, 
  Eye, 
  Settings,
  FormInput,
  Mail,
  Phone,
  Hash,
  Calendar,
  Clock,
  FileText,
  List,
  CheckSquare,
  Upload,
  Edit,
  Palette,
  ExternalLink,
  Copy,
  FileSpreadsheet
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { Switch } from "@/components/ui/switch";

interface FormField {
  id: string;
  type: string;
  label: string;
  description: string;
  placeholder: string;
  is_required: boolean;
  options: string[];
  order_index: number;
}

interface FormData {
  title: string;
  description: string;
  slug: string;
  is_published: boolean;
  allow_multiple_submissions: boolean;
  show_progress_bar: boolean;
  require_login: boolean;
  webhook_url: string;
  success_message: string;
  submit_button_text: string;
  theme_color: string;
  // Mensagem de boas-vindas
  welcome_enabled: boolean;
  welcome_title: string;
  welcome_description: string;
  welcome_button_text: string;
  // Controle de respostas
  responses_paused: boolean;
  pause_message: string;
  // Personalização de estilo
  button_color: string;
  question_color: string;
  answer_color: string;
  background_color: string;
}

const fieldTypes = [
  { value: 'name', label: 'Nome', icon: FormInput },
  { value: 'email', label: 'E-mail', icon: Mail },
  { value: 'number', label: 'Número', icon: Hash },
  { value: 'text', label: 'Resposta Curta', icon: FormInput },
  { value: 'textarea', label: 'Texto Longo', icon: FileText },
  { value: 'tel', label: 'Telefone', icon: Phone },
  { value: 'url', label: 'Link', icon: ExternalLink },
  { value: 'checkbox', label: 'Múltipla Escolha', icon: CheckSquare },
  { value: 'select', label: 'Lista Suspensa', icon: List },
  { value: 'terms', label: 'Termos de Uso', icon: CheckSquare },
  { value: 'file', label: 'Upload de Arquivo', icon: Upload },
];

const CreateEditForm = () => {
  const { formId } = useParams();
  const isEditing = Boolean(formId);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { createSpreadsheet, getSheetsStatus } = useGoogleSheetsIntegration();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    slug: '',
    is_published: false,
    allow_multiple_submissions: true,
    show_progress_bar: false,
    require_login: false,
    webhook_url: '',
    success_message: 'Obrigado por sua resposta!',
    submit_button_text: 'Enviar',
    theme_color: '#718570',
    // Mensagem de boas-vindas
    welcome_enabled: false,
    welcome_title: 'Bem-vindo!',
    welcome_description: 'Por favor, preencha o formulário abaixo.',
    welcome_button_text: 'Começar',
    // Controle de respostas
    responses_paused: false,
    pause_message: 'Este formulário não está recebendo respostas no momento.',
    // Personalização de estilo  
    button_color: '#718570',
    question_color: '#181818',
    answer_color: '#364636',
    background_color: '#FFFFFF',
  });

  const [fields, setFields] = useState<FormField[]>([]);
  const [activeTab, setActiveTab] = useState<'fields' | 'settings'>('fields');
  const [editorTab, setEditorTab] = useState<'editor' | 'options'>('editor');

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
    if (isEditing && user) {
      loadFormData();
    }
  }, [isEditing, user, formId]);

  const loadFormData = async () => {
    try {
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (formError) throw formError;

      // Extrair configurações extras do webhook_url JSON
      let extraSettings: any = {};
      let webhookUrl = formData.webhook_url || '';
      
      try {
        if (formData.webhook_url && formData.webhook_url.startsWith('{')) {
          const parsedData = JSON.parse(formData.webhook_url);
          extraSettings = parsedData.settings || {};
          webhookUrl = (extraSettings as any).original_webhook_url || (parsedData as any).url || '';
        }
      } catch (error) {
        // Se não conseguir fazer parse, usar como string simples
        webhookUrl = formData.webhook_url || '';
      }

      setFormData({
        title: formData.title,
        description: formData.description || '',
        slug: formData.slug,
        is_published: formData.is_published,
        allow_multiple_submissions: extraSettings.allow_multiple_submissions ?? formData.allow_multiple_submissions,
        show_progress_bar: extraSettings.show_progress_bar ?? formData.show_progress_bar,
        require_login: extraSettings.require_login ?? formData.require_login,
        webhook_url: webhookUrl,
        success_message: extraSettings.success_message || formData.success_message,
        submit_button_text: extraSettings.submit_button_text || formData.submit_button_text,
        theme_color: extraSettings.theme_color || formData.theme_color,
        welcome_enabled: extraSettings.welcome_enabled || false,
        welcome_title: extraSettings.welcome_title || 'Bem-vindo!',
        welcome_description: extraSettings.welcome_description || 'Por favor, preencha o formulário abaixo.',
        welcome_button_text: extraSettings.welcome_button_text || 'Começar',
        responses_paused: extraSettings.responses_paused || false,
        pause_message: extraSettings.pause_message || 'Este formulário não está recebendo respostas no momento.',
        button_color: extraSettings.button_color || '#718570',
        question_color: extraSettings.question_color || '#181818',
        answer_color: extraSettings.answer_color || '#364636',
        background_color: extraSettings.background_color || '#FFFFFF',
      });

      const { data: fieldsData, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formId)
        .order('order_index');

      if (fieldsError) throw fieldsError;

      setFields(fieldsData.map(field => ({
        id: field.id,
        type: field.type,
        label: field.label,
        description: field.description || '',
        placeholder: field.placeholder || '',
        is_required: field.is_required,
        options: Array.isArray(field.options) ? field.options.map(String) : [],
        order_index: field.order_index,
      })));

    } catch (error) {
      console.error('Error loading form:', error);
      toast({
        title: "Erro ao carregar formulário",
        description: "Não foi possível carregar os dados do formulário.",
        variant: "destructive",
      });
    }
  };

  const generateSlug = async (title: string, excludeId?: string): Promise<string> => {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    let slug = baseSlug;
    let counter = 1;
    
    // Verificar se o slug já existe
    while (true) {
      const { data: existingForm } = await supabase
        .from('forms')
        .select('id')
        .eq('slug', slug)
        .not('id', 'eq', excludeId || 'never-match')
        .single();
      
      if (!existingForm) {
        break; // Slug é único
      }
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return slug;
  };

  const handleTitleChange = async (title: string) => {
    const newSlug = formData.slug || await generateSlug(title, formId);
    setFormData(prev => ({
      ...prev,
      title,
      slug: newSlug
    }));
  };

  const addField = (type: string) => {
    const getFieldLabel = (type: string) => {
      switch (type) {
        case 'name': return 'Nome completo';
        case 'email': return 'Endereço de e-mail';
        case 'number': return 'Número';
        case 'text': return 'Resposta curta';
        case 'textarea': return 'Texto longo';
        case 'tel': return 'Telefone';
        case 'url': return 'Link/URL';
        case 'checkbox': return 'Múltipla escolha';
        case 'select': return 'Lista suspensa';
        case 'terms': return 'Aceito os termos de uso';
        case 'file': return 'Upload de arquivo';
        default: return `Nova pergunta ${type}`;
      }
    };

    const getFieldPlaceholder = (type: string) => {
      switch (type) {
        case 'name': return 'Digite seu nome completo';
        case 'email': return 'exemplo@email.com';
        case 'number': return 'Digite um número';
        case 'text': return 'Digite sua resposta';
        case 'textarea': return 'Digite uma resposta mais detalhada...';
        case 'tel': return '(11) 99999-9999';
        case 'url': return 'https://exemplo.com';
        case 'terms': return '';
        case 'file': return 'Clique para selecionar um arquivo';
        default: return '';
      }
    };

    const newField: FormField = {
      id: `temp-${Date.now()}`,
      type,
      label: getFieldLabel(type),
      description: '',
      placeholder: getFieldPlaceholder(type),
      is_required: type === 'terms' ? true : false,
      options: ['select', 'checkbox'].includes(type) ? ['Opção 1', 'Opção 2'] : [],
      order_index: fields.length,
    };
    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
  };

  const moveField = (fromIndex: number, toIndex: number) => {
    const newFields = [...fields];
    const [removed] = newFields.splice(fromIndex, 1);
    newFields.splice(toIndex, 0, removed);
    
    // Update order_index
    const updatedFields = newFields.map((field, index) => ({
      ...field,
      order_index: index
    }));
    
    setFields(updatedFields);
  };

  const saveForm = async () => {
    console.log('🚀 Iniciando saveForm...');
    console.log('📝 User:', user);
    console.log('📋 Form data:', formData);
    console.log('🔢 Fields count:', fields.length);
    
    if (!formData.title.trim()) {
      console.log('❌ Título vazio');
      toast({
        title: "Título obrigatório",
        description: "Por favor, insira um título para o formulário.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Separar campos que existem na tabela forms dos campos extras
      const finalSlug = formData.slug || await generateSlug(formData.title, formId);
      
      const baseFormFields = {
        title: formData.title,
        description: formData.description,
        is_published: formData.is_published,
        slug: finalSlug,
        user_id: user?.id,
      };

      // Campos extras que serão armazenados no webhook_url como JSON
      const extraSettings = {
        welcome_enabled: formData.welcome_enabled,
        welcome_title: formData.welcome_title,
        welcome_description: formData.welcome_description,
        welcome_button_text: formData.welcome_button_text,
        responses_paused: formData.responses_paused,
        pause_message: formData.pause_message,
        button_color: formData.button_color,
        question_color: formData.question_color,
        answer_color: formData.answer_color,
        background_color: formData.background_color,
        allow_multiple_submissions: formData.allow_multiple_submissions,
        show_progress_bar: formData.show_progress_bar,
        require_login: formData.require_login,
        success_message: formData.success_message,
        submit_button_text: formData.submit_button_text,
        theme_color: formData.theme_color,
        original_webhook_url: formData.webhook_url,
      };

      // Tentar extrair dados existentes do webhook_url
      let existingWebhookData = {};
      try {
        if (formData.webhook_url && formData.webhook_url.startsWith('{')) {
          existingWebhookData = JSON.parse(formData.webhook_url);
        }
      } catch (error) {
        // Se não conseguir fazer parse, manter como string simples
        if (formData.webhook_url) {
          existingWebhookData = { url: formData.webhook_url };
        }
      }

      const updatedWebhookData = {
        ...existingWebhookData,
        settings: extraSettings
      };

      const formToSave = {
        ...baseFormFields,
        webhook_url: JSON.stringify(updatedWebhookData),
      };

      console.log('💾 Dados do formulário para salvar:', formToSave);

      let savedFormId = formId;

      if (isEditing) {
        console.log('✏️ Editando formulário existente:', formId);
        const { error: formError } = await supabase
          .from('forms')
          .update(formToSave)
          .eq('id', formId);

        if (formError) {
          console.error('❌ Erro ao atualizar formulário:', formError);
          throw formError;
        }
        console.log('✅ Formulário atualizado com sucesso');
      } else {
        console.log('🆕 Criando novo formulário...');
        const { data: newForm, error: formError } = await supabase
          .from('forms')
          .insert([formToSave])
          .select()
          .single();

        if (formError) {
          console.error('❌ Erro ao inserir formulário:', formError);
          throw formError;
        }
        console.log('✅ Novo formulário criado:', newForm);
        savedFormId = newForm.id;
      }

      // Save fields
      if (isEditing) {
        const { error: deleteError } = await supabase
          .from('form_fields')
          .delete()
          .eq('form_id', formId);
        
        if (deleteError) throw deleteError;
      }

      if (fields.length > 0) {
        const fieldsToSave = fields.map(field => {
          // Garantir que o tipo não seja null ou undefined
          const fieldType = field.type || 'text';
          
          return {
            form_id: savedFormId,
            type: fieldType,
            label: field.label || 'Campo sem título',
            description: field.description || null,
            placeholder: field.placeholder || null,
            is_required: field.is_required || false,
            options: field.options && field.options.length > 0 ? field.options : null,
            order_index: field.order_index || 0,
          };
        });

        console.log('📝 Salvando campos:', fieldsToSave);
        
        // Verificar se algum campo tem problemas antes de salvar
        const invalidFields = fieldsToSave.filter(field => !field.type || !field.label);
        if (invalidFields.length > 0) {
          console.error('❌ Campos inválidos encontrados:', invalidFields);
          throw new Error(`Campos inválidos: ${invalidFields.length} campo(s) sem tipo ou título`);
        }
        
        const { error: fieldsError } = await supabase
          .from('form_fields')
          .insert(fieldsToSave);

        if (fieldsError) {
          console.error('❌ Erro ao inserir campos:', fieldsError);
          throw fieldsError;
        }
        console.log('✅ Campos salvos com sucesso');
      }

      toast({
        title: isEditing ? "Formulário atualizado!" : "Formulário criado!",
        description: isEditing ? "As alterações foram salvas com sucesso." : "Seu formulário foi criado com sucesso.",
      });

      // Integração automática com Google Sheets (apenas para novos formulários)
      if (!isEditing && fields.length > 0) {
        try {
          const questions: FormQuestion[] = fields.map(field => ({
            id: field.id || `temp-${field.order_index}`,
            title: field.label,
            type: field.type
          }));

          // Criar planilha em background (não bloquear navegação)
          createSpreadsheet(savedFormId, formData.title, questions).catch(error => {
            console.error('Erro na integração com Google Sheets:', error);
          });
        } catch (error) {
          console.error('Erro ao configurar integração Google Sheets:', error);
        }
      }

      navigate('/dashboard');

    } catch (error) {
      console.error('💥 Error saving form:', error);
      console.error('📄 Error details:', JSON.stringify(error, null, 2));
      toast({
        title: "Erro ao salvar",
        description: `Não foi possível salvar o formulário: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive",
      });
    } finally {
      console.log('🏁 Finalizando saveForm...');
      setSaving(false);
    }
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
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => formData.is_published && window.open(`/form/${formData.slug}`, '_blank')}
              disabled={!formData.is_published}
            >
              <Eye className="w-4 h-4 mr-2" />
              Visualizar
            </Button>
            <Button 
              onClick={saveForm}
              disabled={saving}
              className="bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditing ? 'Salvar Alterações' : 'Salvar Formulário'}
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form Builder */}
          <div className="lg:col-span-2">
            <Card className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{isEditing ? 'Editar Formulário' : 'Criar Novo Formulário'}</CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      variant={activeTab === 'fields' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveTab('fields')}
                    >
                      Campos
                    </Button>
                    <Button
                      variant={activeTab === 'settings' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveTab('settings')}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configurações
                    </Button>
                  </div>
                </div>
                {activeTab === 'fields' && (
                  <div className="mt-4">
                    <Tabs value={editorTab} onValueChange={(value) => setEditorTab(value as 'editor' | 'options')} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="editor" className="flex items-center space-x-2">
                          <Edit className="w-4 h-4" />
                          <span>Editor</span>
                        </TabsTrigger>
                        <TabsTrigger value="options" className="flex items-center space-x-2">
                          <Palette className="w-4 h-4" />
                          <span>Opções</span>
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {activeTab === 'fields' ? (
                  <Tabs value={editorTab} onValueChange={(value) => setEditorTab(value as 'editor' | 'options')} className="w-full">
                    <TabsContent value="editor" className="space-y-6">
                      {/* Mensagem de Boas-Vindas */}
                      <div className="space-y-4 p-4 border border-form-field-border rounded-lg bg-form-field-bg">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">Mensagem de Boas-Vindas</h3>
                          <Switch
                            checked={formData.welcome_enabled}
                            onCheckedChange={(checked) => 
                              setFormData(prev => ({ ...prev, welcome_enabled: checked }))
                            }
                          />
                        </div>
                        
                        {formData.welcome_enabled && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="welcome-title">Título da mensagem</Label>
                              <Input
                                id="welcome-title"
                                value={formData.welcome_title}
                                onChange={(e) => setFormData(prev => ({ ...prev, welcome_title: e.target.value }))}
                                placeholder="Bem-vindo!"
                                className="bg-background"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="welcome-description">Descrição/Instruções</Label>
                              <Textarea
                                id="welcome-description"
                                value={formData.welcome_description}
                                onChange={(e) => setFormData(prev => ({ ...prev, welcome_description: e.target.value }))}
                                placeholder="Por favor, preencha o formulário abaixo."
                                className="bg-background"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="welcome-button">Texto do botão</Label>
                              <Input
                                id="welcome-button"
                                value={formData.welcome_button_text}
                                onChange={(e) => setFormData(prev => ({ ...prev, welcome_button_text: e.target.value }))}
                                placeholder="Começar"
                                className="bg-background"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Controle de Respostas */}
                      <div className="space-y-4 p-4 border border-form-field-border rounded-lg bg-form-field-bg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">Controle de Respostas</h3>
                            <p className="text-sm text-muted-foreground">
                              Pause temporariamente o recebimento de novas respostas
                            </p>
                          </div>
                          <Switch
                            checked={formData.responses_paused}
                            onCheckedChange={(checked) => 
                              setFormData(prev => ({ ...prev, responses_paused: checked }))
                            }
                          />
                        </div>
                        
                        {formData.responses_paused && (
                          <div className="space-y-2">
                            <Label htmlFor="pause-message">Mensagem para usuários</Label>
                            <Textarea
                              id="pause-message"
                              value={formData.pause_message}
                              onChange={(e) => setFormData(prev => ({ ...prev, pause_message: e.target.value }))}
                              placeholder="Este formulário não está recebendo respostas no momento."
                              className="bg-background"
                            />
                          </div>
                        )}
                      </div>

                      {/* Form Basic Info */}
                      <div className="space-y-4 p-4 border border-form-field-border rounded-lg bg-form-field-bg">
                        <div className="space-y-2">
                          <Label htmlFor="title">Título do Formulário *</Label>
                          <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            placeholder="Digite o título do seu formulário"
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Descrição</Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Descreva o propósito do seu formulário"
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="slug">URL do Formulário</Label>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-form-field-border bg-muted text-muted-foreground text-sm">
                              {window.location.origin}/form/
                            </span>
                            <Input
                              id="slug"
                              value={formData.slug}
                              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                              placeholder="meu-formulario"
                              className="bg-background rounded-l-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Form Fields */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Campos do Formulário</h3>
                        
                        {fields.map((field, index) => (
                          <FieldEditor
                            key={field.id}
                            field={field}
                            onUpdate={(updates) => updateField(field.id, updates)}
                            onRemove={() => removeField(field.id)}
                            onMoveUp={index > 0 ? () => moveField(index, index - 1) : undefined}
                            onMoveDown={index < fields.length - 1 ? () => moveField(index, index + 1) : undefined}
                          />
                        ))}

                        {fields.length === 0 && (
                          <div className="text-center py-8 border-2 border-dashed border-form-field-border rounded-lg">
                            <FormInput className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">
                              Seu formulário ainda não tem campos. Adicione o primeiro!
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="options" className="space-y-6">
                      {/* Personalizar Estilo */}
                      <div className="space-y-4 p-4 border border-form-field-border rounded-lg bg-form-field-bg">
                        <h3 className="text-lg font-semibold">Personalizar Estilo</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="button-color">Cor do Botão</Label>
                            <div className="flex items-center space-x-2">
                              <Input
                                type="color"
                                value={formData.button_color}
                                onChange={(e) => setFormData(prev => ({ ...prev, button_color: e.target.value }))}
                                className="w-16 h-10 bg-background border"
                              />
                              <Input
                                value={formData.button_color}
                                onChange={(e) => setFormData(prev => ({ ...prev, button_color: e.target.value }))}
                                placeholder="#718570"
                                className="bg-background"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="question-color">Cor da Pergunta</Label>
                            <div className="flex items-center space-x-2">
                              <Input
                                type="color"
                                value={formData.question_color}
                                onChange={(e) => setFormData(prev => ({ ...prev, question_color: e.target.value }))}
                                className="w-16 h-10 bg-background border"
                              />
                              <Input
                                value={formData.question_color}
                                onChange={(e) => setFormData(prev => ({ ...prev, question_color: e.target.value }))}
                                placeholder="#181818"
                                className="bg-background"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="answer-color">Cor da Resposta</Label>
                            <div className="flex items-center space-x-2">
                              <Input
                                type="color"
                                value={formData.answer_color}
                                onChange={(e) => setFormData(prev => ({ ...prev, answer_color: e.target.value }))}
                                className="w-16 h-10 bg-background border"
                              />
                              <Input
                                value={formData.answer_color}
                                onChange={(e) => setFormData(prev => ({ ...prev, answer_color: e.target.value }))}
                                placeholder="#364636"
                                className="bg-background"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="background-color">Cor de Fundo</Label>
                            <div className="flex items-center space-x-2">
                              <Input
                                type="color"
                                value={formData.background_color}
                                onChange={(e) => setFormData(prev => ({ ...prev, background_color: e.target.value }))}
                                className="w-16 h-10 bg-background border"
                              />
                              <Input
                                value={formData.background_color}
                                onChange={(e) => setFormData(prev => ({ ...prev, background_color: e.target.value }))}
                                placeholder="#FFFFFF"
                                className="bg-background"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Preview */}
                        <div className="mt-6 p-4 border border-form-field-border rounded-lg" style={{ backgroundColor: formData.background_color }}>
                          <h4 className="text-sm font-medium mb-3">Preview das Cores</h4>
                          <div className="space-y-3">
                            <div style={{ color: formData.question_color }} className="font-medium">
                              Como você avalia nosso serviço?
                            </div>
                            <div style={{ color: formData.answer_color }}>
                              Esta é uma resposta de exemplo
                            </div>
                            <Button 
                              size="sm" 
                              style={{ backgroundColor: formData.button_color, color: '#FFFFFF' }}
                              className="hover:opacity-90"
                            >
                              {formData.submit_button_text}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <FormSettings
                    formData={formData}
                    onUpdate={setFormData}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {activeTab === 'fields' && (
              <Card className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
                <CardHeader>
                  <CardTitle className="text-base">Adicionar Campo</CardTitle>
                  <CardDescription>
                    Clique em um tipo de campo para adicionar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {fieldTypes.map((fieldType) => {
                      const Icon = fieldType.icon;
                      return (
                        <Button
                          key={fieldType.value}
                          variant="outline"
                          onClick={() => addField(fieldType.value)}
                          className="h-auto p-3 flex flex-col items-center space-y-2 hover:border-primary/50"
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-xs">{fieldType.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
              <CardHeader>
                <CardTitle className="text-base">Status da Publicação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {formData.is_published ? 'Publicado' : 'Rascunho'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formData.is_published 
                        ? 'Seu formulário está ativo e recebendo respostas'
                        : 'Seu formulário está salvo como rascunho'
                      }
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_published}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, is_published: checked }))
                    }
                  />
                </div>
                {formData.is_published && formData.slug && (
                  <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg">
                    <p className="text-xs font-medium text-success-foreground mb-2">
                      Link do formulário:
                    </p>
                    <div className="flex items-center space-x-2">
                      <code className="text-xs bg-background px-2 py-1 rounded flex-1 overflow-hidden">
                        {window.location.origin}/form/{formData.slug}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/form/${formData.slug}`);
                          toast({ title: "Link copiado!" });
                        }}
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Google Sheets Integration */}
            {isEditing && formData.slug && (
              <Card className="border border-form-field-border bg-gradient-to-br from-card to-form-field-bg">
                <CardHeader>
                  <CardTitle className="text-base flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>Google Sheets</span>
                  </CardTitle>
                  <CardDescription>
                    Planilha para coleta de respostas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <GoogleSheetsCard formId={formId!} webhookUrl={formData.webhook_url || null} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};


// Field Editor Component
const FieldEditor = ({ 
  field, 
  onUpdate, 
  onRemove, 
  onMoveUp, 
  onMoveDown 
}: {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) => {
  const [showOptions, setShowOptions] = useState(['select', 'radio', 'checkbox'].includes(field.type));

  const addOption = () => {
    const newOptions = [...field.options, `Opção ${field.options.length + 1}`];
    onUpdate({ options: newOptions });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...field.options];
    newOptions[index] = value;
    onUpdate({ options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = field.options.filter((_, i) => i !== index);
    onUpdate({ options: newOptions });
  };

  return (
    <div className="p-4 border border-form-field-border rounded-lg bg-form-field-bg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
          <Badge variant="outline">{fieldTypes.find(t => t.value === field.type)?.label}</Badge>
        </div>
        <div className="flex items-center space-x-2">
          {onMoveUp && (
            <Button variant="ghost" size="sm" onClick={onMoveUp}>
              ↑
            </Button>
          )}
          {onMoveDown && (
            <Button variant="ghost" size="sm" onClick={onMoveDown}>
              ↓
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Pergunta *</Label>
          <Input
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="Digite sua pergunta"
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label>Texto de ajuda</Label>
          <Input
            value={field.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Explicação opcional"
            className="bg-background"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Placeholder</Label>
        <Input
          value={field.placeholder}
          onChange={(e) => onUpdate({ placeholder: e.target.value })}
          placeholder="Ex: Digite seu nome completo"
          className="bg-background"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id={`required-${field.id}`}
          checked={field.is_required}
          onCheckedChange={(checked) => onUpdate({ is_required: Boolean(checked) })}
        />
        <Label htmlFor={`required-${field.id}`}>Campo obrigatório</Label>
      </div>

      {showOptions && (
        <div className="space-y-2">
          <Label>Opções</Label>
          {field.options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Input
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Opção ${index + 1}`}
                className="bg-background"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeOption(index)}
                disabled={field.options.length <= 1}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addOption}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Opção
          </Button>
        </div>
      )}
    </div>
  );
};

// Form Settings Component
const FormSettings = ({ 
  formData, 
  onUpdate 
}: {
  formData: FormData;
  onUpdate: (data: FormData) => void;
}) => {
  const { getSheetsStatus } = useGoogleSheetsIntegration();
  const { toast } = useToast();
  
  // Parse webhook data to get Google Sheets status
  const sheetsStatus = getSheetsStatus(formData.webhook_url);
  
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Configurações Gerais</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Permitir múltiplas submissões</Label>
            <p className="text-sm text-muted-foreground">
              Usuários podem responder o formulário mais de uma vez
            </p>
          </div>
          <Switch
            checked={formData.allow_multiple_submissions}
            onCheckedChange={(checked) => 
              onUpdate({ ...formData, allow_multiple_submissions: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Mostrar barra de progresso</Label>
            <p className="text-sm text-muted-foreground">
              Exibe o progresso de preenchimento do formulário
            </p>
          </div>
          <Switch
            checked={formData.show_progress_bar}
            onCheckedChange={(checked) => 
              onUpdate({ ...formData, show_progress_bar: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Exigir login</Label>
            <p className="text-sm text-muted-foreground">
              Apenas usuários logados podem responder
            </p>
          </div>
          <Switch
            checked={formData.require_login}
            onCheckedChange={(checked) => 
              onUpdate({ ...formData, require_login: checked })
            }
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Mensagens e Textos</h3>
        
        <div className="space-y-2">
          <Label>Mensagem de sucesso</Label>
          <Textarea
            value={formData.success_message}
            onChange={(e) => onUpdate({ ...formData, success_message: e.target.value })}
            placeholder="Mensagem exibida após o envio"
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label>Texto do botão de envio</Label>
          <Input
            value={formData.submit_button_text}
            onChange={(e) => onUpdate({ ...formData, submit_button_text: e.target.value })}
            placeholder="Ex: Enviar, Cadastrar, Confirmar"
            className="bg-background"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Integrações</h3>
        
        {/* Google Sheets Integration Status */}
        {sheetsStatus.spreadsheetId && (
          <div className="p-4 bg-success/10 border border-success/20 rounded-lg space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <h4 className="font-medium text-success-foreground">Google Sheets Integrado</h4>
            </div>
            <p className="text-sm text-success-foreground/80">
              As respostas deste formulário estão sendo sincronizadas automaticamente com o Google Sheets.
            </p>
            <div className="space-y-2">
              <Label className="text-success-foreground font-medium">Link da Planilha:</Label>
              <div className="flex items-center space-x-2">
                <code className="text-xs bg-background px-3 py-2 rounded flex-1 overflow-hidden border">
                  https://docs.google.com/spreadsheets/d/{sheetsStatus.spreadsheetId}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`https://docs.google.com/spreadsheets/d/${sheetsStatus.spreadsheetId}`);
                    toast({ title: "Link da planilha copiado!" });
                  }}
                  className="shrink-0"
                >
                  Copiar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${sheetsStatus.spreadsheetId}`, '_blank')}
                  className="shrink-0"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Abrir
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          <Label>Webhook URL</Label>
          <Input
            value={formData.webhook_url}
            onChange={(e) => onUpdate({ ...formData, webhook_url: e.target.value })}
            placeholder="https://exemplo.com/webhook"
            className="bg-background"
          />
          <p className="text-xs text-muted-foreground">
            URL que receberá os dados quando o formulário for enviado
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Aparência</h3>
        
        <div className="space-y-2">
          <Label>Cor do tema</Label>
          <div className="flex items-center space-x-4">
            <Input
              type="color"
              value={formData.theme_color}
              onChange={(e) => onUpdate({ ...formData, theme_color: e.target.value })}
              className="w-20 h-10 bg-background"
            />
            <Input
              value={formData.theme_color}
              onChange={(e) => onUpdate({ ...formData, theme_color: e.target.value })}
              placeholder="#6366f1"
              className="bg-background"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Google Sheets Card Component
const GoogleSheetsCard = ({ formId, webhookUrl }: { formId: string; webhookUrl: string | null }) => {
  const { toast } = useToast();
  const { getSheetsStatus } = useGoogleSheetsIntegration();
  
  const sheetsStatus = getSheetsStatus(webhookUrl);
  
  const getGoogleSheetsUrl = () => {
    if (!sheetsStatus?.spreadsheetId) return null;
    return `https://docs.google.com/spreadsheets/d/${sheetsStatus.spreadsheetId}/edit`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Link copiado!",
        description: "O link da planilha foi copiado para a área de transferência.",
      });
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link.",
        variant: "destructive",
      });
    }
  };

  const sheetsUrl = getGoogleSheetsUrl();

  return (
    <div className="space-y-4">
      {sheetsUrl ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm font-medium text-green-700">Planilha ativa</span>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 break-all">{sheetsUrl}</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => copyToClipboard(sheetsUrl)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
            <Button
              onClick={() => window.open(sheetsUrl, '_blank')}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Planilha
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full" />
            <span className="text-sm font-medium text-gray-600">Planilha ainda não foi criada</span>
          </div>
          
          <p className="text-sm text-gray-500">
            A planilha será criada automaticamente quando o formulário for salvo.
          </p>
        </div>
      )}
    </div>
  );
};

export default CreateEditForm;