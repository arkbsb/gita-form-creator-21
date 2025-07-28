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

    const { formId, action } = await req.json();
    console.log(`Processing webhook for form ${formId} with action: ${action}`);

    // Retry mechanism to handle database consistency
    let form = null;
    let attempts = 0;
    const maxAttempts = 5;
    const retryDelay = 1000; // 1 second between retries

    while (!form && attempts < maxAttempts) {
      attempts++;
      console.log(`Attempt ${attempts}/${maxAttempts} to fetch form ${formId}`);
      
      // Get form data with fields
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select(`
          *,
          form_fields(*)
        `)
        .eq('id', formId)
        .maybeSingle();

      if (formError) {
        console.error('Error fetching form:', formError);
        throw formError;
      }

      if (formData) {
        form = formData;
        console.log(`✅ Form found on attempt ${attempts}`);
        break;
      } else {
        console.log(`❌ Form not found on attempt ${attempts}, retrying in ${retryDelay}ms...`);
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    if (!form) {
      console.log('Form not found after all retry attempts:', formId);
      return new Response(
        JSON.stringify({ success: false, message: 'Form not found after retries' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // URL fixo para criação/atualização de formulários
    const webhookUrl = 'https://autowebhook.gita.work/webhook/criar-planilha-forms';
    console.log(`Sending webhook for form ${formId} with action: ${action} to ${webhookUrl}`);

    // Prepare webhook payload
    const webhookPayload = {
      action, // 'create' or 'update'
      timestamp: new Date().toISOString(),
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        slug: form.slug,
        theme_color: form.theme_color,
        is_published: form.is_published,
        allow_multiple_submissions: form.allow_multiple_submissions,
        success_message: form.success_message,
        submit_button_text: form.submit_button_text,
        welcome_message: form.welcome_message,
        welcome_button_text: form.welcome_button_text,
        show_welcome_screen: form.show_welcome_screen,
        created_at: form.created_at,
        updated_at: form.updated_at
      },
      fields: form.form_fields?.map(field => ({
        id: field.id,
        type: field.type,
        label: field.label,
        placeholder: field.placeholder,
        is_required: field.is_required,
        options: field.options,
        order_index: field.order_index
      })) || []
    };

    console.log('Sending webhook to:', webhookUrl);
    
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

    console.log('Webhook sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook sent successfully',
        status: webhookResponse.status 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-form-webhook function:', error);
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