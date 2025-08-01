import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { FormInput, Loader2, ArrowLeft } from "lucide-react";
import logoGita from "@/assets/logo-gita.svg";
import { User, Session } from "@supabase/supabase-js";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { token: urlToken } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [inviteValid, setInviteValid] = useState(false);
  const [inviteChecking, setInviteChecking] = useState(false);

  // Verificar token de convite na URL
  useEffect(() => {
    const token = searchParams.get('invite') || urlToken;
    if (token) {
      setInviteToken(token);
      validateInviteToken(token);
    }
  }, [searchParams, urlToken]);

  // Verificar se o usuário já está autenticado
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Redirect authenticated users to dashboard
        if (session?.user) {
          navigate('/dashboard');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Validar token de convite
  const validateInviteToken = async (token: string) => {
    setInviteChecking(true);
    try {
      const { data, error } = await (supabase as any).rpc('use_invitation_token', {
        p_token: token,
        p_user_id: null // Apenas validar, não usar ainda
      }) as { data: { success: boolean; error?: string } | null; error: any };

      if (error) {
        console.error('Erro ao validar convite:', error);
        setInviteValid(false);
        setError('Erro ao validar convite: ' + error.message);
        return;
      }

      if (data && data.success) {
        setInviteValid(true);
      } else {
        setInviteValid(false);
        setError((data && data.error) || 'Convite inválido ou expirado');
      }
    } catch (error: any) {
      setInviteValid(false);
      setError('Erro ao validar convite: ' + error.message);
    } finally {
      setInviteChecking(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Verificar se há token de convite válido
    if (!inviteToken || !inviteValid) {
      setError("É necessário um convite válido para criar uma conta.");
      setLoading(false);
      return;
    }

    if (!email || !password || !fullName) {
      setError("Todos os campos são obrigatórios");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName
          }
        }
      });

      if (error) {
        if (error.message.includes("already registered")) {
          setError("Este email já está cadastrado. Tente fazer login.");
        } else {
          setError(error.message);
        }
      } else if (data.user) {
        // Marcar convite como usado
        const { error: inviteError } = await (supabase as any).rpc('use_invitation_token', {
          p_token: inviteToken,
          p_user_id: data.user.id
        });

        if (inviteError) {
          console.error('Erro ao marcar convite como usado:', inviteError);
        }

        // Criar perfil do usuário (usando estrutura atual)
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              user_id: data.user.id,
              full_name: fullName,
              invitation_token: inviteToken
            }
          ]);

        if (profileError) {
          console.error('Erro ao criar perfil:', profileError);
        }

        toast({
          title: "Conta criada com sucesso!",
          description: "Você foi automaticamente logado e pode começar a criar formulários.",
        });
      }
    } catch (error: any) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email || !password) {
      setError("Email e senha são obrigatórios");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Email ou senha incorretos");
        } else {
          setError(error.message);
        }
      } else {
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo de volta ao Gita Responses.",
        });
      }
    } catch (error: any) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-form-builder-bg to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao início
          </Button>
          
          <div className="flex items-center justify-center space-x-2 mb-4">
            <img src={logoGita} alt="Gita" className="h-16 w-auto" />
          </div>
          <p className="text-muted-foreground">
            {inviteToken ? "Use seu convite para criar uma conta" : "Entre na sua conta"}
          </p>
        </div>

        <Card className="border border-form-field-border shadow-lg bg-gradient-to-br from-card to-form-field-bg">
          <CardContent className="p-6">
            <Tabs defaultValue={inviteToken ? "signup" : "signin"} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup" disabled={!inviteToken} className="text-sm">
                  {inviteToken ? "Criar Conta" : "Conta (Convite)"}
                </TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-form-field-bg border-form-field-border focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Senha</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-form-field-bg border-form-field-border focus:border-primary"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {inviteToken && (
                  <Alert className={inviteValid ? "border-green-500 bg-green-50" : "border-orange-500 bg-orange-50"} style={{ marginBottom: '1rem' }}>
                    <AlertDescription>
                      {inviteChecking 
                        ? "Validando convite..." 
                        : inviteValid 
                          ? "✅ Convite válido! Você pode criar sua conta." 
                          : "❌ Convite inválido ou expirado."
                      }
                    </AlertDescription>
                  </Alert>
                )}
                
                {!inviteToken && (
                  <Alert className="border-orange-500 bg-orange-50" style={{ marginBottom: '1rem' }}>
                    <AlertDescription>
                      ⚠️ Para criar uma conta, você precisa de um convite válido. Entre em contato com um administrador.
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={!inviteValid}
                      className="bg-form-field-bg border-form-field-border focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={!inviteValid}
                      className="bg-form-field-bg border-form-field-border focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={!inviteValid}
                      className="bg-form-field-bg border-form-field-border focus:border-primary"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary"
                    disabled={loading || !inviteValid || inviteChecking}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      "Criar Conta"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>
            Ao criar uma conta, você concorda com nossos termos de uso e política de privacidade.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;