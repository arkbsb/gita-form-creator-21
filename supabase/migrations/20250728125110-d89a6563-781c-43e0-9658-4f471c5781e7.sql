-- Adicionar campos para mensagem de boas vindas na tabela forms
ALTER TABLE public.forms 
ADD COLUMN welcome_message TEXT,
ADD COLUMN welcome_button_text TEXT DEFAULT 'Começar',
ADD COLUMN show_welcome_screen BOOLEAN DEFAULT false;