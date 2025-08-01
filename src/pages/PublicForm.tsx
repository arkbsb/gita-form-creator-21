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
  show_welcome_screen?: boolean;
  welcome_message?: string;
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

const formatPhoneNumber = (value: string): string => {
  // Remove tudo que não seja número
  const numbers = value.replace(/\D/g, '');
  
  // Formatar para (XX) XXXXX-XXXX
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  } else if (numbers.length <= 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  } else {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  }
};

const PublicForm = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [form, setForm] = useState<FormData | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [responses, setResponses] = useState<FieldResponse>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [errors, setErrors] = useState<{ [fieldId: string]: string }>({});
  const [showWelcome, setShowWelcome] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');

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
    console.log('🔍 loadForm iniciado para slug:', slug);
    console.log('🔍 URL atual:', window.location.href);
    
    try {
      setLoading(true);
      setDebugInfo(`Buscando formulário com slug: ${slug}`);
      
      console.log('🔍 Fazendo query no Supabase...');
      let { data: formData, error: formError } = await supabase
        .from('forms')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      console.log('🔍 Resultado da query:', { formData, formError });

      if (formError) {
        console.error('❌ Erro ao buscar formulário:', formError);
        setDebugInfo(`Erro: ${formError.message}`);
        throw new Error('Erro ao buscar formulário: ' + formError.message);
      }

      if (!formData) {
        console.log('❌ Formulário não encontrado para slug:', slug);
        setDebugInfo(`Formulário não encontrado para slug: ${slug}`);
        throw new Error('Formulário não encontrado ou não está publicado');
      }

      console.log('✅ Formulário encontrado:', formData);
      setDebugInfo(`Formulário encontrado: ${formData.title}`);

      // Configurar dados do formulário diretamente do banco
      const parsedFormData: FormData = {
        ...formData,
        show_welcome_screen: formData.show_welcome_screen || false,
        welcome_message: formData.welcome_message || '',
        welcome_button_text: formData.welcome_button_text || 'Começar'
      } as FormData;
      
      console.log('🔍 parsedFormData final:', parsedFormData);
      console.log('🔍 show_welcome_screen:', parsedFormData.show_welcome_screen);
      console.log('🔍 welcome_message:', parsedFormData.welcome_message);
      console.log('🔍 showWelcome state atual:', showWelcome);

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
    
    if (field.is_required && (!value || value === '' || (Array.isArray(value) && value.length === 0))) {
      return 'Este campo é obrigatório';
    }

    if (value && field.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value as string)) {
        return 'E-mail inválido';
      }
    }

    if (value && field.type === 'url') {
      try {
        new URL(value as string);
      } catch {
        return 'URL inválida';
      }
    }

    if (value && field.type === 'tel') {
      const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
      if (!phoneRegex.test(value as string)) {
        return 'Telefone deve estar no formato (11) 99999-9999';
      }
    }

    if (value && field.type === 'name') {
      const nameValue = value as string;
      if (nameValue.trim().split(' ').length < 2) {
        return 'Por favor, digite seu nome completo';
      }
    }

    if (value && field.type === 'number') {
      if (isNaN(Number(value))) {
        return 'Digite apenas números';
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

      // Enviar webhook para n8n (adicionar resposta)
      try {
        await fetch('/api/webhook/submission', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            submissionId: submission.id
          })
        });
        console.log('Webhook de submissão enviado com sucesso');
      } catch (webhookError) {
        console.error('Erro ao enviar webhook de submissão:', webhookError);
        // Não mostrar erro para o usuário, pois a submissão foi bem-sucedida
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
      case 'name':
      case 'text':
      case 'email':
      case 'number':
      case 'url':
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
              type={field.type === 'name' ? 'text' : field.type}
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

      case 'tel':
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
              type="tel"
              value={value as string}
              onChange={(e) => {
                const formatted = formatPhoneNumber(e.target.value);
                handleFieldChange(field.id, formatted);
              }}
              placeholder={field.placeholder || "(11) 99999-9999"}
              className="w-full text-center text-lg py-3 bg-transparent border-0 border-b-2 rounded-none focus:ring-0 border-muted-foreground/30 focus:border-primary"
              maxLength={15}
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

      case 'terms':
        return (
          <div className="space-y-2">
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <div className="flex items-start space-x-3 p-4 border border-border/30 rounded-lg bg-muted/10">
              <Checkbox
                id={field.id}
                checked={value === 'accepted'}
                onCheckedChange={(checked) => {
                  handleFieldChange(field.id, checked ? 'accepted' : '');
                }}
              />
              <Label htmlFor={field.id} className="font-normal leading-relaxed text-sm">
                {field.label}
              </Label>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        );

      case 'file':
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
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFieldChange(field.id, file.name);
                } else {
                  handleFieldChange(field.id, '');
                }
              }}
              className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
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
      case 'name':
      case 'text':
      case 'email':
      case 'number':
      case 'url':
        return (
          <Input
            id={field.id}
            type={field.type === 'name' ? 'text' : field.type}
            value={value as string}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || "Sua resposta..."}
            className="w-full text-left text-lg py-4 px-6 bg-muted/20 border border-border/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:bg-muted/30"
          />
        );

      case 'tel':
        return (
          <Input
            id={field.id}
            type="tel"
            value={value as string}
            onChange={(e) => {
              const formatted = formatPhoneNumber(e.target.value);
              handleFieldChange(field.id, formatted);
            }}
            placeholder={field.placeholder || "(11) 99999-9999"}
            className="w-full text-left text-lg py-4 px-6 bg-muted/20 border border-border/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:bg-muted/30"
            maxLength={15}
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

      case 'terms':
        return (
          <div className="p-4 bg-muted/20 border border-border/30 rounded-xl">
            <div className="flex items-start space-x-3">
              <Checkbox
                id={field.id}
                checked={value === 'accepted'}
                onCheckedChange={(checked) => {
                  handleFieldChange(field.id, checked ? 'accepted' : '');
                }}
              />
              <Label htmlFor={field.id} className="text-lg font-normal leading-relaxed cursor-pointer flex-1 text-left">
                {field.label}
              </Label>
            </div>
          </div>
        );

      case 'file':
        return (
          <div className="p-6 bg-muted/20 border-2 border-dashed border-border/30 rounded-xl hover:bg-muted/30 transition-all duration-200">
            <Input
              id={field.id}
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFieldChange(field.id, file.name);
                } else {
                  handleFieldChange(field.id, '');
                }
              }}
              className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {value && (
              <p className="text-sm text-muted-foreground mt-2">
                Arquivo selecionado: {value}
              </p>
            )}
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
            <p className="text-muted-foreground mb-4">
              O formulário solicitado não existe ou não está mais disponível.
            </p>
            <div className="bg-gray-100 p-3 rounded text-sm text-left mb-4">
              <strong>Debug:</strong> {debugInfo}<br/>
              <strong>Slug:</strong> {slug}<br/>
              <strong>URL:</strong> {window.location.href}
            </div>
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
  if (form?.show_welcome_screen && showWelcome && form.welcome_message) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center p-4">
        <div className="w-full max-w-2xl mx-auto">
          <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                    {form.title}
                  </h1>
                  <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
                    {form.welcome_message}
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