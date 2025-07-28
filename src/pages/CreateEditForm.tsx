import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical, ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

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
  is_sequential: boolean;
  allow_multiple_submissions: boolean;
  fields: FormField[];
}

const CreateEditForm = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    is_sequential: false,
    allow_multiple_submissions: true,
    fields: []
  });

  useEffect(() => {
    if (formId) {
      loadForm();
    }
  }, [formId]);

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
        is_sequential: false, // Not in database schema
        allow_multiple_submissions: form.allow_multiple_submissions !== false,
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

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(formData.fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedFields = items.map((field, index) => ({
      ...field,
      order_position: index
    }));

    setFormData(prev => ({
      ...prev,
      fields: updatedFields
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
    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "O título do formulário é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      let savedFormId = formId;

      if (formId) {
        // Atualizar formulário existente
        const { error: formError } = await supabase
          .from('forms')
          .update({
            title: formData.title,
            description: formData.description,
            allow_multiple_submissions: formData.allow_multiple_submissions
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
          <Button onClick={saveForm} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
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
                id="sequential"
                checked={formData.is_sequential}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_sequential: checked }))}
              />
              <Label htmlFor="sequential">Formulário sequencial (uma pergunta por vez)</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="multiple"
                checked={formData.allow_multiple_submissions}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_multiple_submissions: checked }))}
              />
              <Label htmlFor="multiple">Permitir múltiplas submissões</Label>
            </div>
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
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="fields">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {formData.fields.map((field, index) => (
                      <Draggable key={field.id} draggableId={field.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="p-4 border rounded-lg bg-card"
                          >
                            <div className="flex items-start gap-4">
                              <div {...provided.dragHandleProps} className="mt-2">
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                              </div>

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
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {formData.fields.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Nenhum campo adicionado ainda.</p>
                        <p>Clique em "Adicionar Campo" para começar.</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateEditForm;