-- Sistema de Convites por Link Único

-- Tabela de convites de usuários
CREATE TABLE public.user_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT, -- Email específico (opcional)
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES auth.users(id),
  max_uses INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT, -- Descrição do convite
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar coluna na tabela profiles para rastrear convites usados
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'invitation_token'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN invitation_token TEXT;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para convites
-- Administradores podem ver e gerenciar seus próprios convites
CREATE POLICY "Users can view their own invitations" 
ON public.user_invitations 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can create invitations" 
ON public.user_invitations 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own invitations" 
ON public.user_invitations 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own invitations" 
ON public.user_invitations 
FOR DELETE 
USING (auth.uid() = created_by);

-- Política especial para permitir que qualquer pessoa (anônima) possa ler convites válidos para validação
CREATE POLICY "Anyone can read active invitations for validation" 
ON public.user_invitations 
FOR SELECT 
USING (
  is_active = true 
  AND expires_at > now() 
  AND current_uses < max_uses
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_invitations_updated_at
BEFORE UPDATE ON public.user_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para gerar token único
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Função para validar e usar convite
CREATE OR REPLACE FUNCTION public.use_invitation_token(
  p_token TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  invitation_record RECORD;
  result JSONB;
BEGIN
  -- Buscar convite válido
  SELECT * INTO invitation_record
  FROM public.user_invitations
  WHERE token = p_token
    AND is_active = true
    AND expires_at > now()
    AND current_uses < max_uses;

  -- Se não encontrou convite válido
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Convite inválido, expirado ou já utilizado'
    );
  END IF;

  -- Se um user_id foi fornecido, marcar como usado
  IF p_user_id IS NOT NULL THEN
    UPDATE public.user_invitations
    SET 
      current_uses = current_uses + 1,
      used_at = CASE WHEN used_at IS NULL THEN now() ELSE used_at END,
      used_by = CASE WHEN used_by IS NULL THEN p_user_id ELSE used_by END,
      updated_at = now()
    WHERE id = invitation_record.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'invitation', row_to_json(invitation_record)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar índices para melhor performance
CREATE INDEX idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX idx_user_invitations_created_by ON public.user_invitations(created_by);
CREATE INDEX idx_user_invitations_expires_at ON public.user_invitations(expires_at);
CREATE INDEX idx_user_invitations_active ON public.user_invitations(is_active, expires_at);