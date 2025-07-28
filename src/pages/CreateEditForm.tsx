import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CreateEditForm = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  
  console.log('CreateEditForm renderizado com UI components!', { formId });
  
  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Teste com UI Components funcionando</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>FormId: {formId || 'novo'}</Label>
            <Input placeholder="Teste de input" />
          </div>
          <Button onClick={() => navigate('/dashboard')}>
            Voltar ao Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateEditForm;