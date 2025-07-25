import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Loader2, FormInput } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useParams, useNavigate } from "react-router-dom";
import { useGoogleSheetsIntegration } from "@/hooks/useGoogleSheetsIntegration";

interface FormData {
  id: string;
  title: string;
  description: string | null;
  success_message: string;
  submit_button_text: string;
  theme_color: string;
  show_progress_bar: boolean;
  require_login: boolean;
  allow_multiple_submissions: boolean;
  is_published: boolean;
  webhook_url: string | null;
  // Campos de boas-vindas
  welcome_enabled?: boolean;
  welcome_title?: string;
  welcome_description?: string;
  welcome_button_text?: string;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  description: string | null;
  placeholder: string | null;
  is_required: boolean;
  options: string[] | null;
  order_index: number;
}

interface FieldResponse {
  [fieldId: string]: string | string[];
}

const PublicForm = () => {
  console.log('=== PUBLICFORM COMPONENT CARREGADO ===');
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sendResponseToSheet, getSheetsStatus } = useGoogleSheetsIntegration();
  
  const [form, setForm] = useState<FormData | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [responses, setResponses] = useState<FieldResponse>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [errors, setErrors] = useState<{ [fieldId: string]: string }>({});
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    console.log('PublicForm carregou! Slug:', slug);
    if (slug) {
      console.log('Iniciando loadForm para slug:', slug);
      loadForm();
    } else {
      console.log('Slug não encontrado na URL');
    }
  }, [slug]);

  const loadForm = async () => {
    console.log('loadForm iniciado para slug:', slug);
    try {
      setLoading(true);
      
      // Load form data
      let { data: formData, error: formError } = await supabase
        .from('forms')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      console.log('Debug - resultado da consulta (published=true):', { formData, formError });

      // Se não encontrar, tentar buscar sem filtro de publicação para debug
      if (formError || !formData) {
        const { data: debugFormData, error: debugError } = await supabase
          .from('forms')
          .select('*')
          .eq('slug', slug)
          .single();
        
        console.log('Debug - formulário existe mas não está publicado?', { 
          debugFormData, 
          debugError,
          is_published: debugFormData?.is_published 
        });
        
        if (debugFormData && !debugFormData.is_published) {
          throw new Error('Formulário não está publicado');
        } else if (!debugFormData) {
          throw new Error('Formulário não encontrado');
        }
      }

      if (formError || !formData) {
        console.error('Error loading form:', formError);
        throw new Error('Formulário não encontrado ou não está publicado');
      }

      // Parse webhook_url para extrair configurações de boas-vindas
      let parsedFormData: FormData = formData as FormData;
      
      console.log('Debug - webhook_url bruto:', formData.webhook_url);
      console.log('Debug - is_published:', formData.is_published);
      
      if (formData.webhook_url) {
        try {
          const webhookData = JSON.parse(formData.webhook_url);
          console.log('Debug - webhookData parseado:', webhookData);
          
          if (typeof webhookData === 'object' && webhookData !== null) {
            // Extrair configurações de boas-vindas do JSON
            parsedFormData = {
              ...formData,
              welcome_enabled: webhookData.welcome_enabled || false,
              welcome_title: webhookData.welcome_title || 'Bem-vindo!',
              welcome_description: webhookData.welcome_description || 'Por favor, preencha o formulário abaixo.',
              welcome_button_text: webhookData.welcome_button_text || 'Começar'
            } as FormData;
            
            console.log('Debug - configurações de boas-vindas extraídas:', {
              welcome_enabled: parsedFormData.welcome_enabled,
              welcome_title: parsedFormData.welcome_title,
              welcome_description: parsedFormData.welcome_description,
              welcome_button_text: parsedFormData.welcome_button_text
            });
          }
        } catch (error) {
          // Se não conseguir fazer parse, mantém os dados originais
          console.log('Debug - webhook URL não é JSON válido, usando configurações padrão:', error);
          console.log('Debug - webhook_url que falhou no parse:', formData.webhook_url);
        }
      } else {
        console.log('Debug - webhook_url é null/undefined');
      }

      setForm(parsedFormData);

      // Load form fields
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formData.id)
        .order('order_index');

      if (fieldsError) {
        throw fieldsError;
      }

      setFields(fieldsData.map(field => ({
        ...field,
        options: Array.isArray(field.options) ? field.options.map(String) : null,
      })));

    } catch (error) {
      console.error('Error loading form:', error);
      console.error('Detalhes do erro:', error);
      toast({
        title: "Erro ao carregar formulário",
        description: "O formulário solicitado não foi encontrado ou não está publicado.",
        variant: "destructive",
      });
      // Removido navigate('/') para mostrar erro na tela
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: string | string[]) => {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear error for this field
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateField = (field: FormField): string | null => {
    const value = responses[field.id];
    
    if (field.is_required) {
      if (!value || (Array.isArray(value) && value.length === 0) || value === '') {
        return 'Este campo é obrigatório';
      }
    }

    if (value && field.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value as string)) {
        return 'Email inválido';
      }
    }

    if (value && field.type === 'url') {
      try {
        new URL(value as string);
      } catch {
        return 'URL inválida';
      }
    }

    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: { [fieldId: string]: string } = {};
    
    fields.forEach(field => {
      const error = validateField(field);
      if (error) {
        newErrors[field.id] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!form || !fields) return;
    
    const currentField = fields[currentQuestionIndex];
    if (currentField) {
      const error = validateField(currentField);
      if (error) {
        setErrors({ [currentField.id]: error });
        toast({
          title: "Campo obrigatório",
          description: "Por favor, responda esta pergunta antes de continuar.",
          variant: "destructive",
        });
        return;
      }
      setErrors({});
    }
    
    if (currentQuestionIndex < fields.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      submitForm();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setErrors({});
    }
  };

  const submitForm = async () => {
    setSubmitting(true);
    
    try {
      // Create submission
      const submissionData = {
        form_id: form!.id,
        submission_data: responses,
        ip_address: null,
        user_agent: navigator.userAgent,
      };

      const { data: submission, error: submissionError } = await supabase
        .from('form_submissions')
        .insert([submissionData])
        .select()
        .single();

      if (submissionError) {
        throw submissionError;
      }

      // Create field responses
      const fieldResponses = fields.map(field => ({
        submission_id: submission.id,
        field_id: field.id,
        value: Array.isArray(responses[field.id]) 
          ? (responses[field.id] as string[]).join(', ')
          : (responses[field.id] as string) || null,
      }));

      const { error: responsesError } = await supabase
        .from('form_field_responses')
        .insert(fieldResponses);

      if (responsesError) {
        throw responsesError;
      }

      // Send webhook if configured
      if (form!.webhook_url) {
        try {
          await fetch(form!.webhook_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            mode: 'no-cors',
            body: JSON.stringify({
              form_id: form!.id,
              form_title: form!.title,
              submission_id: submission.id,
              submitted_at: submission.submitted_at,
              responses: responses,
            }),
          });
        } catch (webhookError) {
          console.error('Webhook error:', webhookError);
        }
      }

      // Integração automática com Google Sheets
      console.log('Form webhook_url para Google Sheets:', form!.webhook_url);
      const sheetsStatus = getSheetsStatus(form!.webhook_url);
      console.log('Status da integração Google Sheets:', sheetsStatus);
      
      if (sheetsStatus.spreadsheetId) {
        try {
          console.log('Enviando resposta para planilha:', sheetsStatus.spreadsheetId);
          const formattedResponses = fields.map(field => ({
            questionId: field.id,
            question: field.label,
            answer: Array.isArray(responses[field.id]) 
              ? (responses[field.id] as string[]).join(', ')
              : (responses[field.id] as string) || ''
          }));

          // Enviar para Google Sheets em background
          sendResponseToSheet(
            sheetsStatus.spreadsheetId,
            form!.id,
            formattedResponses,
            new Date().toISOString()
          );
        } catch (sheetsError) {
          console.error('Erro ao sincronizar com Google Sheets:', sheetsError);
        }
      } else {
        console.log('Spreadsheet ID não encontrado, pulando integração Google Sheets');
        console.log('Detalhes do status:', JSON.stringify(sheetsStatus, null, 2));
        
        // Se não há spreadsheetId, verificar se o webhook_url está no formato antigo
        if (form!.webhook_url && !form!.webhook_url.includes('spreadsheetId')) {
          console.log('Webhook URL parece estar no formato antigo (apenas URL)');
        }
      }

      setSubmitted(true);
      toast({
        title: "Formulário enviado!",
        description: form!.success_message,
      });

    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar o formulário. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getProgress = () => {
    const totalFields = fields.length;
    const filledFields = fields.filter(field => {
      const value = responses[field.id];
      return value && value !== '' && !(Array.isArray(value) && value.length === 0);
    }).length;
    
    return totalFields > 0 ? (filledFields / totalFields) * 100 : 0;
  };

  const renderField = (field: FormField) => {
    const value = responses[field.id] || '';
    const error = errors[field.id];
    const hasError = Boolean(error);

    const baseClasses = `w-full ${hasError ? 'border-destructive' : ''}`;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'tel':
      case 'url':
      case 'date':
      case 'time':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className="flex items-center space-x-1">
              <span>{field.label}</span>
              {field.is_required && <span className="text-destructive">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <Input
              id={field.id}
              type={field.type}
              value={value as string}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder || "Sua resposta..."}
              className="w-full text-center text-lg py-3 bg-transparent border-0 border-b-2 rounded-none focus:ring-0 border-muted-foreground/30 focus:border-primary"
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className="flex items-center space-x-1">
              <span>{field.label}</span>
              {field.is_required && <span className="text-destructive">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <Textarea
              id={field.id}
              value={value as string}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder || "Sua resposta..."}
              className="w-full text-center text-lg py-3 bg-transparent border-0 border-b-2 rounded-none focus:ring-0 resize-none min-h-24 border-muted-foreground/30 focus:border-primary"
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className="flex items-center space-x-1">
              <span>{field.label}</span>
              {field.is_required && <span className="text-destructive">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <Select 
              value={value as string} 
              onValueChange={(newValue) => handleFieldChange(field.id, newValue)}
            >
              <SelectTrigger className={baseClasses}>
                <SelectValue placeholder={field.placeholder || 'Selecione uma opção'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            <Label className="flex items-center space-x-1">
              <span>{field.label}</span>
              {field.is_required && <span className="text-destructive">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <RadioGroup
              value={value as string}
              onValueChange={(newValue) => handleFieldChange(field.id, newValue)}
              className="space-y-2"
            >
              {field.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${field.id}-${index}`} />
                  <Label htmlFor={`${field.id}-${index}`} className="font-normal">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            <Label className="flex items-center space-x-1">
              <span>{field.label}</span>
              {field.is_required && <span className="text-destructive">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <div className="space-y-2">
              {field.options?.map((option, index) => {
                const isChecked = Array.isArray(value) && value.includes(option);
                return (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${field.id}-${index}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const currentValues = Array.isArray(value) ? value : [];
                        if (checked) {
                          handleFieldChange(field.id, [...currentValues, option]);
                        } else {
                          handleFieldChange(field.id, currentValues.filter(v => v !== option));
                        }
                      }}
                    />
                    <Label htmlFor={`${field.id}-${index}`} className="font-normal">
                      {option}
                    </Label>
                  </div>
                );
              })}
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderSequentialField = (field: FormField) => {
    const value = responses[field.id] || '';
    
    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'tel':
      case 'url':
      case 'date':
      case 'time':
        return (
          <Input
            id={field.id}
            type={field.type}
            value={value as string}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || "Sua resposta..."}
            className="w-full text-left text-lg py-4 px-6 bg-muted/20 border border-border/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:bg-muted/30"
          />
        );

      case 'textarea':
        return (
          <Textarea
            id={field.id}
            value={value as string}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || "Sua resposta..."}
            className="w-full text-left text-lg py-4 px-6 bg-muted/20 border border-border/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:bg-muted/30 resize-none min-h-32"
          />
        );

      case 'select':
        return (
          <Select 
            value={value as string} 
            onValueChange={(newValue) => handleFieldChange(field.id, newValue)}
          >
            <SelectTrigger className="w-full text-left text-lg py-4 px-6 bg-muted/20 border border-border/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:bg-muted/30">
              <SelectValue placeholder={field.placeholder || 'Selecione uma opção'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, index) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'radio':
        return (
          <RadioGroup
            value={value as string}
            onValueChange={(newValue) => handleFieldChange(field.id, newValue)}
            className="space-y-4"
          >
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-3 p-4 bg-muted/20 hover:bg-muted/30 border border-border/30 rounded-xl transition-all duration-200 cursor-pointer">
                <RadioGroupItem value={option} id={`${field.id}-${index}`} />
                <Label htmlFor={`${field.id}-${index}`} className="text-lg font-normal cursor-pointer flex-1 text-left">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'checkbox':
        return (
          <div className="space-y-4">
            {field.options?.map((option, index) => {
              const isChecked = Array.isArray(value) && value.includes(option);
              return (
                <div key={index} className="flex items-center space-x-3 p-4 bg-muted/20 hover:bg-muted/30 border border-border/30 rounded-xl transition-all duration-200 cursor-pointer">
                  <Checkbox
                    id={`${field.id}-${index}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const currentValues = Array.isArray(value) ? value : [];
                      if (checked) {
                        handleFieldChange(field.id, [...currentValues, option]);
                      } else {
                        handleFieldChange(field.id, currentValues.filter(v => v !== option));
                      }
                    }}
                  />
                  <Label htmlFor={`${field.id}-${index}`} className="text-lg font-normal cursor-pointer flex-1 text-left">
                    {option}
                  </Label>
                </div>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando formulário...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-semibold mb-4">Formulário não encontrado</h2>
            <p className="text-muted-foreground mb-6">
              O formulário solicitado não existe ou não está mais disponível.
            </p>
            <Button onClick={() => navigate('/')}>
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-form-builder-bg to-accent/20 p-4">
        <Card className="w-full max-w-2xl border-form-field-border">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Obrigado!</h2>
            <p className="text-muted-foreground text-lg mb-8">
              {form.success_message}
            </p>
            {form.allow_multiple_submissions && (
              <Button 
                onClick={() => {
                  setSubmitted(false);
                  setResponses({});
                  setErrors({});
                }}
                style={{ backgroundColor: form.theme_color }}
              >
                Enviar outra resposta
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mostrar tela de boas-vindas se habilitada
  if (form?.welcome_enabled && showWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center p-4">
        <div className="w-full max-w-2xl mx-auto">
          <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                    {form.welcome_title}
                  </h1>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {form.welcome_description}
                  </p>
                </div>
                
                <div className="pt-8">
                  <Button
                    onClick={() => setShowWelcome(false)}
                    className="px-8 py-3 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg transition-all duration-200 transform hover:scale-105"
                    style={{ backgroundColor: form.theme_color }}
                  >
                    {form.welcome_button_text}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentField = fields[currentQuestionIndex];
  const progress = fields.length > 0 ? ((currentQuestionIndex + 1) / fields.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        

        {/* Progress Bar */}
        {form.show_progress_bar && fields.length > 1 && (
          <div className="mb-12">
            <div className="w-full bg-muted/40 rounded-full h-2 shadow-inner">
              <div 
                className="h-2 rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-primary to-primary/80 shadow-lg"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-muted-foreground">
                Questão {currentQuestionIndex + 1} de {fields.length}
              </span>
              <span className="text-sm font-medium text-primary">
                {Math.round(progress)}% completo
              </span>
            </div>
          </div>
        )}

        {/* Form Card */}
        <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm">
          <CardContent className="p-8 md:p-12">
            {fields.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FormInput className="w-12 h-12 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold mb-4 text-foreground">Formulário vazio</h2>
                <p className="text-muted-foreground text-lg">
                  Este formulário ainda não possui campos configurados.
                </p>
              </div>
            ) : (
              /* Current Question */
              <div className="space-y-10">
                {/* Question Section */}
                <div className="text-left space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {currentQuestionIndex + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl md:text-3xl font-semibold text-foreground leading-tight mb-3">
                        {currentField.label}
                        {currentField.is_required && (
                          <span className="text-destructive ml-2 text-lg">*</span>
                        )}
                      </h2>
                      {currentField.description && (
                        <p className="text-lg text-muted-foreground leading-relaxed">
                          {currentField.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Input Section */}
                <div className="pl-12">
                  <div className="space-y-4">
                    {renderSequentialField(currentField)}
                    {errors[currentField.id] && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                        <p className="text-destructive font-medium">{errors[currentField.id]}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation Section */}
                <div className="flex justify-between items-center pt-8 border-t border-border/50">
                  <div>
                    {currentQuestionIndex > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrevious}
                        className="px-6 py-3 text-base font-medium hover:bg-muted/50 transition-all duration-200"
                      >
                        ← Anterior
                      </Button>
                    )}
                  </div>
                  
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={submitting}
                    className="px-8 py-3 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Enviando...
                      </>
                    ) : currentQuestionIndex === fields.length - 1 ? (
                      <>
                        Enviar formulário
                        <CheckCircle className="ml-2 h-5 w-5" />
                      </>
                    ) : (
                      <>
                        Próxima
                        →
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Pressione <kbd className="px-2 py-1 bg-muted/50 rounded text-xs">Enter</kbd> para avançar
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicForm;