-- Atualizar constraint para incluir os novos tipos de campos
ALTER TABLE public.form_fields 
DROP CONSTRAINT form_fields_type_check;

ALTER TABLE public.form_fields 
ADD CONSTRAINT form_fields_type_check 
CHECK (type = ANY (ARRAY[
  'text'::text, 
  'email'::text, 
  'number'::text, 
  'tel'::text, 
  'url'::text, 
  'textarea'::text, 
  'select'::text, 
  'radio'::text, 
  'checkbox'::text, 
  'date'::text, 
  'time'::text, 
  'file'::text,
  'name'::text,
  'terms'::text
]));