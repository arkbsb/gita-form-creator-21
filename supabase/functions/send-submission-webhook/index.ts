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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { submissionId } = await req.json();
    console.log(`Processing submission webhook for submission ${submissionId}`);

    // Get submission data with form info and field responses
    const { data: submission, error: submissionError } = await supabase
      .from('form_submissions')
      .select(`
        *,
        forms!inner(
          id,
          title,
          user_id
        )
      `)
      .eq('id', submissionId)
      .maybeSingle();

    if (submissionError) {
      console.error('Error fetching submission:', submissionError);
      throw submissionError;
    }

    if (!submission) {
      console.log('Submission not found:', submissionId);
      return new Response(
        JSON.stringify({ success: false, message: 'Submission not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get field responses
    const { data: fieldResponses, error: responsesError } = await supabase
      .from('form_field_responses')
      .select(`
        *,
        form_fields!inner(
          label,
          type,
          options
        )
      `)
      .eq('submission_id', submissionId);

    if (responsesError) {
      console.error('Error fetching field responses:', responsesError);
      throw responsesError;
    }

    // URL fixo para submissões de formulários
    const webhookUrl = 'https://autowebhook.gita.work/webhook/adicionar-resposta-forms';
    console.log(`Sending submission webhook for submission ${submissionId} to ${webhookUrl}`);

    // Prepare webhook payload
    const webhookPayload = {
      action: 'submission',
      timestamp: new Date().toISOString(),
      form: {
        id: submission.forms.id,
        title: submission.forms.title
      },
      submission: {
        id: submission.id,
        submitted_at: submission.submitted_at,
        submitted_by_email: submission.submitted_by_email,
        ip_address: submission.ip_address,
        user_agent: submission.user_agent
      },
      responses: fieldResponses?.map(response => ({
        field_label: response.form_fields.label,
        field_type: response.form_fields.type,
        field_options: response.form_fields.options,
        value: response.value,
        file_url: response.file_url
      })) || []
    };

    console.log('Sending submission webhook to:', webhookUrl);
    
    // Send webhook to n8n
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      console.error('Webhook failed:', webhookResponse.status, webhookResponse.statusText);
      throw new Error(`Webhook failed: ${webhookResponse.status}`);
    }

    console.log('Submission webhook sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Submission webhook sent successfully',
        status: webhookResponse.status 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-submission-webhook function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});