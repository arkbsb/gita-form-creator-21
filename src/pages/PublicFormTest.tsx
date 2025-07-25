import { useParams } from "react-router-dom";

const PublicFormTest = () => {
  console.log('=== TESTE COMPONENTE CARREGOU ===');
  const { slug } = useParams();
  console.log('Slug do teste:', slug);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Teste do PublicForm</h1>
        <p>Slug: {slug}</p>
        <p>Se você está vendo esta página, o roteamento está funcionando!</p>
      </div>
    </div>
  );
};

export default PublicFormTest;