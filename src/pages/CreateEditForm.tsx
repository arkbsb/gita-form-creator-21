import React from "react";

const CreateEditForm = () => {
  console.log('🚀 CreateEditForm: Component started rendering');
  
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Teste - Criação/Edição de Formulário</h1>
        <p className="text-lg text-muted-foreground">Se você está vendo esta mensagem, o componente está funcionando.</p>
        <div className="mt-8 p-4 bg-primary/10 rounded-lg">
          <p className="text-sm">Este é um componente temporário para testar se a página carrega corretamente.</p>
        </div>
      </div>
    </div>
  );
};

export default CreateEditForm;