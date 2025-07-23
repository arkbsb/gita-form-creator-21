import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FormInput, Share2, Webhook, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import logoImage from "@/assets/logo.jpg";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-form-builder-bg to-accent/20">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img src={logoImage} alt="Gita" className="h-8 w-auto" />
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    await supabase.auth.signOut();
                    toast({ title: "Logout realizado com sucesso!" });
                  }}
                >
                  Sair
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate('/auth')}>
                Entrar
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-6">
            🚀 Sistema Completo de Formulários
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary-light to-accent-foreground bg-clip-text text-transparent leading-tight">
            Crie formulários poderosos
            <br />
            em minutos
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Sistema completo para criação, publicação e análise de formulários. 
            Interface intuitiva, webhooks personalizáveis e design moderno.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="border border-form-field-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-card to-form-field-bg">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg flex items-center justify-center mb-4">
                <FormInput className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Criação Intuitiva</CardTitle>
              <CardDescription>
                Interface drag-and-drop para criar formulários complexos sem programação
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border border-form-field-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-card to-form-field-bg">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-success/10 to-success/20 rounded-lg flex items-center justify-center mb-4">
                <Share2 className="w-6 h-6 text-success" />
              </div>
              <CardTitle>Links Únicos</CardTitle>
              <CardDescription>
                Cada formulário tem um link exclusivo para compartilhamento e integração
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border border-form-field-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-card to-form-field-bg">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-warning/10 to-warning/20 rounded-lg flex items-center justify-center mb-4">
                <Webhook className="w-6 h-6 text-warning" />
              </div>
              <CardTitle>Webhooks Personalizáveis</CardTitle>
              <CardDescription>
                Integre com qualquer sistema através de webhooks em tempo real
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border border-form-field-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-card to-form-field-bg">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-info/10 to-info/20 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-info" />
              </div>
              <CardTitle>Validação Avançada</CardTitle>
              <CardDescription>
                Campos obrigatórios, validações customizadas e tipos específicos
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border border-form-field-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-card to-form-field-bg">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-destructive/10 to-destructive/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle>Performance</CardTitle>
              <CardDescription>
                Carregamento rápido e interface responsiva em todos os dispositivos
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border border-form-field-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-card to-form-field-bg">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-primary-light/10 to-primary-light/20 rounded-lg flex items-center justify-center mb-4">
                <FormInput className="w-6 h-6 text-primary-light" />
              </div>
              <CardTitle>Design Moderno</CardTitle>
              <CardDescription>
                Templates profissionais e customização completa de aparência
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-card via-form-field-bg to-card border border-form-field-border rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para começar?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Crie sua conta e comece a criar formulários profissionais em minutos.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background/80 backdrop-blur-sm py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 Gita Responses. Sistema profissional de criação de formulários.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
