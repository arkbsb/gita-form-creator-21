import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";

const CreateEditForm = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  
  console.log('CreateEditForm com funcionalidades básicas!', { formId, title });
  
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
          <Button variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Digite o título do formulário"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Título atual: {title || 'nenhum'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateEditForm;