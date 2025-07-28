import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CreateEditForm = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    allow_multiple_submissions: true,
    is_published: false
  });
  
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "O título do formulário é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    // Simular salvamento por enquanto
    setTimeout(() => {
      toast({
        title: "Sucesso",
        description: "Formulário salvo com sucesso!"
      });
      setLoading(false);
      // navigate('/dashboard');
    }, 1000);
  };
  
  console.log('CreateEditForm com toast funcionando!', { formId, formData });
  
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">
              {formId ? 'Editar Formulário' : 'Criar Formulário'}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Rascunho'}
            </Button>
            <Button 
              onClick={() => {
                setFormData(prev => ({ ...prev, is_published: true }));
                setTimeout(handleSave, 100);
              }} 
              disabled={loading}
            >
              <Globe className="h-4 w-4 mr-2" />
              Publicar
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Configurações do Formulário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Digite o título do formulário"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Digite uma descrição para o formulário"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="multiple"
                checked={formData.allow_multiple_submissions}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_multiple_submissions: checked }))}
              />
              <Label htmlFor="multiple">Permitir múltiplas submissões</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
              />
              <Label htmlFor="published">Formulário publicado</Label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateEditForm;