-- Gita Responses - Sistema de Criação de Formulários

-- Tabela de formulários
CREATE TABLE public.forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL UNIQUE,
  is_published BOOLEAN NOT NULL DEFAULT false,
  allow_multiple_submissions BOOLEAN NOT NULL DEFAULT true,
  show_progress_bar BOOLEAN NOT NULL DEFAULT false,
  require_login BOOLEAN NOT NULL DEFAULT false,
  webhook_url TEXT,
  success_message TEXT DEFAULT 'Obrigado por sua resposta!',
  submit_button_text TEXT DEFAULT 'Enviar',
  theme_color TEXT DEFAULT '#6366f1',
  background_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de campos dos formulários
CREATE TABLE public.form_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'email', 'number', 'tel', 'url', 'textarea', 'select', 'radio', 'checkbox', 'date', 'time', 'file')),
  label TEXT NOT NULL,
  description TEXT,
  placeholder TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  options JSONB, -- Para select, radio, checkbox
  validation_rules JSONB, -- Para validações customizadas
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de submissões dos formulários
CREATE TABLE public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL,
  submitted_by_email TEXT,
  submitted_by_user_id UUID,
  submission_data JSONB NOT NULL,
  ip_address INET,
  user_agent TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de respostas individuais dos campos
CREATE TABLE public.form_field_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL,
  field_id UUID NOT NULL,
  value TEXT,
  file_url TEXT, -- Para uploads de arquivos
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security em todas as tabelas
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_field_responses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para formulários
CREATE POLICY "Users can view their own forms" 
ON public.forms 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own forms" 
ON public.forms 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own forms" 
ON public.forms 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own forms" 
ON public.forms 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para campos de formulários
CREATE POLICY "Users can view fields of their forms" 
ON public.form_fields 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.forms 
  WHERE forms.id = form_fields.form_id 
  AND forms.user_id = auth.uid()
));

CREATE POLICY "Users can create fields for their forms" 
ON public.form_fields 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.forms 
  WHERE forms.id = form_fields.form_id 
  AND forms.user_id = auth.uid()
));

CREATE POLICY "Users can update fields of their forms" 
ON public.form_fields 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.forms 
  WHERE forms.id = form_fields.form_id 
  AND forms.user_id = auth.uid()
));

CREATE POLICY "Users can delete fields of their forms" 
ON public.form_fields 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.forms 
  WHERE forms.id = form_fields.form_id 
  AND forms.user_id = auth.uid()
));

-- Políticas RLS para submissões
CREATE POLICY "Form owners can view submissions" 
ON public.form_submissions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.forms 
  WHERE forms.id = form_submissions.form_id 
  AND forms.user_id = auth.uid()
));

CREATE POLICY "Anyone can submit to published forms" 
ON public.form_submissions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.forms 
  WHERE forms.id = form_submissions.form_id 
  AND forms.is_published = true
));

-- Políticas RLS para respostas de campos
CREATE POLICY "Form owners can view field responses" 
ON public.form_field_responses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.form_submissions fs
  JOIN public.forms f ON f.id = fs.form_id
  WHERE fs.id = form_field_responses.submission_id 
  AND f.user_id = auth.uid()
));

CREATE POLICY "Anyone can create field responses for submissions" 
ON public.form_field_responses 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.form_submissions fs
  JOIN public.forms f ON f.id = fs.form_id
  WHERE fs.id = form_field_responses.submission_id 
  AND f.is_published = true
));

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_forms_updated_at
BEFORE UPDATE ON public.forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_form_fields_updated_at
BEFORE UPDATE ON public.form_fields
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar foreign keys
ALTER TABLE public.form_fields 
ADD CONSTRAINT form_fields_form_id_fkey 
FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE CASCADE;

ALTER TABLE public.form_submissions 
ADD CONSTRAINT form_submissions_form_id_fkey 
FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE CASCADE;

ALTER TABLE public.form_field_responses 
ADD CONSTRAINT form_field_responses_submission_id_fkey 
FOREIGN KEY (submission_id) REFERENCES public.form_submissions(id) ON DELETE CASCADE;

ALTER TABLE public.form_field_responses 
ADD CONSTRAINT form_field_responses_field_id_fkey 
FOREIGN KEY (field_id) REFERENCES public.form_fields(id) ON DELETE CASCADE;

-- Criar índices para melhor performance
CREATE INDEX idx_forms_user_id ON public.forms(user_id);
CREATE INDEX idx_forms_slug ON public.forms(slug);
CREATE INDEX idx_form_fields_form_id ON public.form_fields(form_id);
CREATE INDEX idx_form_fields_order ON public.form_fields(form_id, order_index);
CREATE INDEX idx_form_submissions_form_id ON public.form_submissions(form_id);
CREATE INDEX idx_form_submissions_submitted_at ON public.form_submissions(submitted_at);
CREATE INDEX idx_form_field_responses_submission_id ON public.form_field_responses(submission_id);
CREATE INDEX idx_form_field_responses_field_id ON public.form_field_responses(field_id);