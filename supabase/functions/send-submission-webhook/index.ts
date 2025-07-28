import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { submissionId } = await req.json();
    console.log(`📝 Processing submission webhook for submission ${submissionId}`);

    // Get submission data with form info and field responses
    const { data: submission, error: submissionError } = await supabase
      .from('form_submissions')
      .select(`
        *,
        forms!inner(
          id,
          title,
          user_id,
          webhook_url
        )
      `)
      .eq('id', submissionId)
      .maybeSingle();

    if (submissionError) {
      console.error('❌ Error fetching submission:', submissionError);
      throw submissionError;
    }

    if (!submission) {
      console.log('❌ Submission not found:', submissionId);
      return new Response(
        JSON.stringify({ success: false, message: 'Submission not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get field responses with field information
    const { data: fieldResponses, error: responsesError } = await supabase
      .from('form_field_responses')
      .select(`
        *,
        form_fields!inner(
          id,
          label,
          type,
          options,
          order_index
        )
      `)
      .eq('submission_id', submissionId)
      .order('form_fields(order_index)');

    if (responsesError) {
      console.error('❌ Error fetching field responses:', responsesError);
      throw responsesError;
    }

    // Check if form has Google Sheets integration
    let spreadsheetId = null;
    if (submission.forms.webhook_url) {
      try {
        const webhookData = JSON.parse(submission.forms.webhook_url);
        spreadsheetId = webhookData?.sheets?.spreadsheetId;
      } catch (error) {
        console.log('⚠️ Could not parse webhook_url as JSON, treating as regular webhook');
      }
    }

    // URL do webhook n8n para adicionar resposta
    const webhookUrl = 'https://auto.gita.work/webhook/adicionar-resposta-forms';
    console.log(`📡 Sending submission webhook for submission ${submissionId} to ${webhookUrl}`);

    // Prepare responses in the format expected by n8n
    const responses = fieldResponses?.map(response => ({
      questionId: response.form_fields.id,
      question: response.form_fields.label,
      answer: response.value || '',
      fieldType: response.form_fields.type,
      fieldOptions: response.form_fields.options
    })) || [];

    // Prepare webhook payload
    const webhookPayload = {
      spreadsheetId: spreadsheetId,
      formId: submission.forms.id,
      formTitle: submission.forms.title,
      submissionId: submission.id,
      submittedAt: submission.submitted_at,
      submittedByEmail: submission.submitted_by_email,
      responses: responses,
      timestamp: new Date().toISOString()
    };

    console.log('📤 Sending submission webhook payload:', JSON.stringify(webhookPayload, null, 2));
    
    // Send webhook to n8n with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error('❌ Submission webhook failed:', webhookResponse.status, webhookResponse.statusText, errorText);
        throw new Error(`Submission webhook failed: ${webhookResponse.status} - ${errorText}`);
      }

      const responseData = await webhookResponse.text();
      console.log('✅ Submission webhook sent successfully, response:', responseData);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Submission webhook sent successfully',
          status: webhookResponse.status,
          response: responseData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('❌ Submission webhook timeout');
        throw new Error('Submission webhook timeout after 30 seconds');
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('❌ Error in send-submission-webhook function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});