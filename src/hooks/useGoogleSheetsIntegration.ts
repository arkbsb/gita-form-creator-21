import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Variável de ambiente (deve ser configurada pelo usuário)
const N8N_WEBHOOK_URL = "https://auto.gita.work";

export interface FormQuestion {
  id: string;
  title: string;
  type: string;
}

export interface SheetsIntegrationStatus {
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  sheetsSyncStatus: 'pending' | 'success' | 'error' | null;
  sheetsSyncError: string | null;
}

// Utilizaremos o campo webhook_url como storage temporário para status JSON
interface WebhookStoredData {
  url?: string;
  sheets?: {
    spreadsheetId?: string;
    spreadsheetUrl?: string;
    syncStatus?: 'pending' | 'success' | 'error';
    syncError?: string;
  };
}

export const useGoogleSheetsIntegration = () => {
  const { toast } = useToast();

  const getWebhookData = (webhookUrl: string | null): WebhookStoredData => {
    if (!webhookUrl) return {};
    try {
      return JSON.parse(webhookUrl);
    } catch {
      return { url: webhookUrl };
    }
  };

  const updateWebhookData = async (formId: string, data: WebhookStoredData) => {
    await supabase
      .from('forms')
      .update({ webhook_url: JSON.stringify(data) })
      .eq('id', formId);
  };

  const createSpreadsheet = async (formId: string, formTitle: string, questions: FormQuestion[]) => {
    try {
      // Buscar dados atuais do webhook
      const { data: form } = await supabase
        .from('forms')
        .select('webhook_url')
        .eq('id', formId)
        .single();

      const currentData = getWebhookData(form?.webhook_url);
      
      // Atualizar status para pending
      await updateWebhookData(formId, {
        ...currentData,
        sheets: {
          ...currentData.sheets,
          syncStatus: 'pending',
          syncError: undefined
        }
      });

      // Fazer chamada para n8n
      const response = await fetch(`${N8N_WEBHOOK_URL}/webhook/criar-planilha-forms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId,
          formTitle,
          questions: questions.map(q => ({
            id: q.id,
            title: q.title,
            type: q.type
          }))
        }),
        signal: AbortSignal.timeout(30000) // timeout 30s
      });

      if (response.ok) {
        const { spreadsheetId, spreadsheetUrl } = await response.json();
        
        // Atualizar formulário com dados da planilha
        await updateWebhookData(formId, {
          ...currentData,
          sheets: {
            spreadsheetId,
            spreadsheetUrl,
            syncStatus: 'success',
            syncError: undefined
          }
        });

        toast({
          title: "✅ Planilha Google Sheets criada!",
          description: "Integração com Google Sheets configurada com sucesso.",
        });

        return { spreadsheetId, spreadsheetUrl };
      } else {
        throw new Error('Falha na criação da planilha');
      }
    } catch (error) {
      console.error('Erro ao criar planilha:', error);
      
      // Buscar dados atuais do webhook
      const { data: form } = await supabase
        .from('forms')
        .select('webhook_url')
        .eq('id', formId)
        .single();

      const currentData = getWebhookData(form?.webhook_url);
      
      // Atualizar status de erro
      await updateWebhookData(formId, {
        ...currentData,
        sheets: {
          ...currentData.sheets,
          syncStatus: 'error',
          syncError: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      });

      toast({
        title: "❌ Erro ao criar planilha",
        description: "Não foi possível criar a planilha Google Sheets.",
        variant: "destructive",
      });

      throw error;
    }
  };

  const sendResponseToSheet = async (
    spreadsheetId: string,
    formId: string,
    responses: Array<{ questionId: string; question: string; answer: string }>,
    submittedAt: string
  ) => {
    try {
      // Enviar para planilha em background (não bloquear submissão)
      await fetch(`${N8N_WEBHOOK_URL}/webhook/adicionar-resposta-forms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          formId,
          responses,
          submittedAt
        })
      });
    } catch (error) {
      // Não bloquear submissão se falhar
      console.error('Erro ao sincronizar com Google Sheets:', error);
    }
  };

  const recreateSpreadsheet = async (formId: string) => {
    try {
      // Buscar dados atuais do webhook
      const { data: form, error: formError } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (formError || !form) {
        throw new Error('Formulário não encontrado');
      }

      const currentData = getWebhookData(form.webhook_url);
      
      // Resetar dados da planilha
      await updateWebhookData(formId, {
        ...currentData,
        sheets: {
          syncStatus: 'pending',
          syncError: undefined
        }
      });

      // Buscar campos do formulário
      const { data: fields, error: fieldsError } = await supabase
        .from('form_fields')
        .select('id, label, type')
        .eq('form_id', formId)
        .order('order_index');

      if (fieldsError) {
        throw fieldsError;
      }

      const questions: FormQuestion[] = fields.map(field => ({
        id: field.id,
        title: field.label,
        type: field.type
      }));

      // Recriar planilha
      return await createSpreadsheet(formId, form.title, questions);
    } catch (error) {
      console.error('Erro ao recriar planilha:', error);
      toast({
        title: "❌ Erro ao recriar planilha",
        description: "Não foi possível recriar a planilha Google Sheets.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getSheetsStatus = (webhookUrl: string | null): SheetsIntegrationStatus => {
    const data = getWebhookData(webhookUrl);
    return {
      spreadsheetId: data.sheets?.spreadsheetId || null,
      spreadsheetUrl: data.sheets?.spreadsheetUrl || null,
      sheetsSyncStatus: data.sheets?.syncStatus || null,
      sheetsSyncError: data.sheets?.syncError || null
    };
  };

  return {
    createSpreadsheet,
    sendResponseToSheet,
    recreateSpreadsheet,
    getSheetsStatus,
    getWebhookData,
    updateWebhookData
  };
};