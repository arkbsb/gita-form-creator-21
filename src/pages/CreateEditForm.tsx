import React from "react";

const CreateEditForm = () => {
  console.log('CreateEditForm component rendered!');
  
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Teste - Criar/Editar Formulário</h1>
        <p className="text-lg">Se você está vendo esta mensagem, o componente está funcionando!</p>
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p>Componente CreateEditForm carregado com sucesso.</p>
          <p>Verifique o console para logs adicionais.</p>
        </div>
      </div>
    </div>
  );
};

export default CreateEditForm;