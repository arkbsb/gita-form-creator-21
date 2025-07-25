-- Criar política RLS para TABELA_MODELO_LEADS (permitir acesso público para leitura/escrita)
-- Esta tabela parece ser usada para leads de formulários públicos
CREATE POLICY "Allow public access to leads" ON public."(TABELA_MODELO_LEADS)"
FOR ALL USING (true) WITH CHECK (true);