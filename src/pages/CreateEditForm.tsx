import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const CreateEditForm = () => {
  const navigate = useNavigate();
  
  console.log('CreateEditForm renderizando...');
  
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Criar Formulário</h1>
        </div>
        
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Componente funcionando!</h2>
          <p className="text-muted-foreground">
            Esta é uma versão simplificada. Se você está vendo esta mensagem, 
            o componente está carregando corretamente.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Verifique o console do navegador para logs de debug.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateEditForm;