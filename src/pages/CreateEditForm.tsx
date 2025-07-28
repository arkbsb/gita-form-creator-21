import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ArrowLeft, Save, Palette, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  order_position: number;
}

interface FormData {
  title: string;
  description: string;
  allow_multiple_submissions: boolean;
  is_published: boolean;
  theme_color: string;
  success_message: string;
  submit_button_text: string;
  welcome_message?: string;
  welcome_button_text?: string;
  show_welcome_screen?: boolean;
  folder_id?: string | null;
  fields: FormField[];
}

const CreateEditForm = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    allow_multiple_submissions: true,
    is_published: false,
    theme_color: "#6366f1",
    success_message: "Obrigado por sua resposta!",
    submit_button_text: "Enviar",
    welcome_message: "",
    welcome_button_text: "Começar",
    show_welcome_screen: false,
    folder_id: null,
    fields: []
  });

  useEffect(() => {
    console.log('🟢 CreateEditForm carregado! FormId:', formId);
    fetchFolders();
    if (formId) {
      loadForm();
    }
  }, [formId]);

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

  const loadForm = async () => {
    setLoading(true);
    try {
      const { data: form, error: formError } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (formError) throw formError;

      const { data: fields, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formId)
        .order('order_index');

      if (fieldsError) throw fieldsError;

      setFormData({
        title: form.title,
        description: form.description || "",
        allow_multiple_submissions: form.allow_multiple_submissions !== false,
        is_published: form.is_published,
        theme_color: form.theme_color || "#6366f1",
        success_message: form.success_message || "Obrigado por sua resposta!",
        submit_button_text: form.submit_button_text || "Enviar",
        welcome_message: form.welcome_message || "",
        welcome_button_text: form.welcome_button_text || "Começar",
        show_welcome_screen: form.show_welcome_screen || false,
        folder_id: form.folder_id || null,
        fields: (fields || []).map(field => ({
          id: field.id,
          type: field.type,
          label: field.label,
          placeholder: field.placeholder || "",
          required: field.is_required,
          options: field.options ? (Array.isArray(field.options) ? field.options as string[] : []) : [],
          order_position: field.order_index
        }))
      });
    } catch (error) {
      console.error('Erro ao carregar formulário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o formulário.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addField = () => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      type: "text",
      label: "Nova pergunta",
      placeholder: "",
      required: false,
      order_position: formData.fields.length,
      options: []
    };

    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }));
  };

  const removeField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }));
  };

  const addOption = (fieldId: string) => {
    updateField(fieldId, {
      options: [...(formData.fields.find(f => f.id === fieldId)?.options || []), "Nova opção"]
    });
  };

  const updateOption = (fieldId: string, optionIndex: number, value: string) => {
    const field = formData.fields.find(f => f.id === fieldId);
    if (!field?.options) return;

    const newOptions = [...field.options];
    newOptions[optionIndex] = value;
    updateField(fieldId, { options: newOptions });
  };

  const removeOption = (fieldId: string, optionIndex: number) => {
    const field = formData.fields.find(f => f.id === fieldId);
    if (!field?.options) return;

    const newOptions = field.options.filter((_, index) => index !== optionIndex);
    updateField(fieldId, { options: newOptions });
  };

  const saveForm = async () => {
    console.log('🟡 INÍCIO da função saveForm');
    console.log('🟡 formData.title:', formData.title);
    
    if (!formData.title.trim()) {
      console.log('❌ Título vazio, retornando erro');
      toast({
        title: "Erro",
        description: "O título do formulário é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    console.log('✅ Título válido, continuando...');
    setLoading(true);
    try {
      let savedFormId = formId;
      console.log('🟡 formId atual:', formId);

      if (formId) {
        // Atualizar formulário existente
        const { error: formError } = await supabase
          .from('forms')
          .update({
            title: formData.title,
            description: formData.description,
            allow_multiple_submissions: formData.allow_multiple_submissions,
            is_published: formData.is_published,
            theme_color: formData.theme_color,
            success_message: formData.success_message,
            submit_button_text: formData.submit_button_text,
            welcome_message: formData.welcome_message,
            welcome_button_text: formData.welcome_button_text,
            show_welcome_screen: formData.show_welcome_screen,
            folder_id: formData.folder_id
          })
          .eq('id', formId);

        if (formError) throw formError;

        // Remover campos existentes
        const { error: deleteError } = await supabase
          .from('form_fields')
          .delete()
          .eq('form_id', formId);

        if (deleteError) throw deleteError;
      } else {
        // Criar novo formulário
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: newForm, error: formError } = await supabase
          .from('forms')
          .insert({
            title: formData.title,
            description: formData.description,
            allow_multiple_submissions: formData.allow_multiple_submissions,
            is_published: formData.is_published,
            theme_color: formData.theme_color,
            success_message: formData.success_message,
            submit_button_text: formData.submit_button_text,
            welcome_message: formData.welcome_message,
            welcome_button_text: formData.welcome_button_text,
            show_welcome_screen: formData.show_welcome_screen,
            folder_id: formData.folder_id,
            slug: `form-${Date.now()}`,
            user_id: user?.id
          })
          .select()
          .single();

        if (formError) throw formError;
        savedFormId = newForm.id;
      }

      // Inserir campos
      if (formData.fields.length > 0) {
        const fieldsToInsert = formData.fields.map(field => ({
          form_id: savedFormId,
          type: field.type,
          label: field.label,
          placeholder: field.placeholder,
          is_required: field.required,
          options: field.options && field.options.length > 0 ? field.options : null,
          order_index: field.order_position
        }));

        const { error: fieldsError } = await supabase
          .from('form_fields')
          .insert(fieldsToInsert);

        if (fieldsError) throw fieldsError;
      }

      toast({
        title: "Sucesso",
        description: formId ? "Formulário atualizado com sucesso!" : "Formulário criado com sucesso!"
      });

      // Enviar webhook para n8n
      console.log('🚀 Tentando enviar webhook para n8n...');
      console.log('🚀 savedFormId:', savedFormId);
      console.log('🚀 formId original:', formId);
      console.log('🚀 Action:', formId ? 'update' : 'create');
      
      try {
        const webhookResponse = await supabase.functions.invoke('send-form-webhook', {
          body: { 
            formId: savedFormId, 
            action: formId ? 'update' : 'create' 
          }
        });
        console.log('✅ Webhook enviado com sucesso:', webhookResponse);
      } catch (webhookError) {
        console.error('❌ Erro ao enviar webhook:', webhookError);
        // Não mostrar erro de webhook para o usuário, pois o formulário foi salvo com sucesso
      }

      navigate('/dashboard');
    } catch (error) {
      console.error('Erro ao salvar formulário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o formulário.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">
              {formId ? 'Editar Formulário' : 'Criar Formulário'}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                console.log('🔵 Botão "Salvar Rascunho" clicado');
                saveForm();
              }} 
              disabled={loading}
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar Rascunho
            </Button>
            <Button 
              onClick={() => {
                console.log('🔵 Botão "Publicar" clicado');
                setFormData(prev => ({ ...prev, is_published: true }));
                setTimeout(() => {
                  console.log('🔵 Executando saveForm após setTimeout');
                  saveForm();
                }, 100);
              }} 
              disabled={loading}
            >
              <Globe className="h-4 w-4 mr-2" />
              Publicar
            </Button>
          </div>
        </div>

        {/* Form Configuration */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Configurações do Formulário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Digite o título do formulário"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Digite uma descrição para o formulário"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="multiple"
                checked={formData.allow_multiple_submissions}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_multiple_submissions: checked }))}
              />
              <Label htmlFor="multiple">Permitir múltiplas submissões</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
              />
              <Label htmlFor="published">Formulário publicado</Label>
            </div>

            <div>
              <Label htmlFor="folder">Pasta do Formulário</Label>
              <Select
                value={formData.folder_id || "root"}
                onValueChange={(value) => setFormData(prev => ({ ...prev, folder_id: value === "root" ? null : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma pasta (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Raiz (sem pasta)</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Personalização */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Personalização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="theme_color">Cor do Tema</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="theme_color"
                  type="color"
                  value={formData.theme_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, theme_color: e.target.value }))}
                  className="w-16 h-10"
                />
                <Input
                  value={formData.theme_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, theme_color: e.target.value }))}
                  placeholder="#6366f1"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="success_message">Mensagem de Sucesso</Label>
              <Textarea
                id="success_message"
                value={formData.success_message}
                onChange={(e) => setFormData(prev => ({ ...prev, success_message: e.target.value }))}
                placeholder="Obrigado por sua resposta!"
              />
            </div>

            <div>
              <Label htmlFor="submit_button_text">Texto do Botão de Envio</Label>
              <Input
                id="submit_button_text"
                value={formData.submit_button_text}
                onChange={(e) => setFormData(prev => ({ ...prev, submit_button_text: e.target.value }))}
                placeholder="Enviar"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="welcome_screen"
                checked={formData.show_welcome_screen}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_welcome_screen: checked }))}
              />
              <Label htmlFor="welcome_screen">Exibir tela de boas vindas</Label>
            </div>

            {formData.show_welcome_screen && (
              <>
                <div>
                  <Label htmlFor="welcome_message">Mensagem de Boas Vindas</Label>
                  <Textarea
                    id="welcome_message"
                    value={formData.welcome_message}
                    onChange={(e) => setFormData(prev => ({ ...prev, welcome_message: e.target.value }))}
                    placeholder="Bem-vindo! Esta é uma mensagem introdutória que aparecerá antes do formulário."
                  />
                </div>

                <div>
                  <Label htmlFor="welcome_button_text">Texto do Botão de Início</Label>
                  <Input
                    id="welcome_button_text"
                    value={formData.welcome_button_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, welcome_button_text: e.target.value }))}
                    placeholder="Começar"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Form Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Campos do Formulário
              <Button onClick={addField}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Campo
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formData.fields.map((field) => (
                <div key={field.id} className="p-4 border rounded-lg bg-card">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Tipo do Campo</Label>
                          <Select
                            value={field.type}
                            onValueChange={(value) => updateField(field.id, { type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="number">Número</SelectItem>
                              <SelectItem value="textarea">Área de Texto</SelectItem>
                              <SelectItem value="select">Seleção</SelectItem>
                              <SelectItem value="radio">Múltipla Escolha</SelectItem>
                              <SelectItem value="checkbox">Caixas de Seleção</SelectItem>
                              <SelectItem value="date">Data</SelectItem>
                              <SelectItem value="file">Arquivo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                          />
                          <Label>Campo obrigatório</Label>
                        </div>
                      </div>

                      <div>
                        <Label>Rótulo</Label>
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          placeholder="Digite o rótulo do campo"
                        />
                      </div>

                      <div>
                        <Label>Placeholder</Label>
                        <Input
                          value={field.placeholder || ""}
                          onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                          placeholder="Digite o texto de placeholder"
                        />
                      </div>

                      {/* Options for select, radio, checkbox */}
                      {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                        <div>
                          <Label>Opções</Label>
                          <div className="space-y-2">
                            {field.options?.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex gap-2">
                                <Input
                                  value={option}
                                  onChange={(e) => updateOption(field.id, optionIndex, e.target.value)}
                                  placeholder="Digite a opção"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeOption(field.id, optionIndex)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addOption(field.id)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Adicionar Opção
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeField(field.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {formData.fields.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum campo adicionado ainda.</p>
                  <p>Clique em "Adicionar Campo" para começar.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateEditForm;