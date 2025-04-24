import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Redirect } from "wouter";

export default function AuthPage() {
  const { isAuthenticated, isLoginLoading, isRegisterLoading, login, register } = useAuth();
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    displayName: ""
  });
  const [activeTab, setActiveTab] = useState("login");
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");

  // Rediriger si déjà authentifié
  if (isAuthenticated) {
    return <Redirect to="/" />;
  }

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    
    if (!loginData.email || !loginData.password) {
      setLoginError("Veuillez remplir tous les champs");
      return;
    }
    
    login(loginData, {
      onError: (error: any) => {
        setLoginError(error.message);
      }
    });
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");
    
    if (!registerData.username || !registerData.email || !registerData.password || !registerData.confirmPassword) {
      setRegisterError("Veuillez remplir tous les champs obligatoires");
      return;
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      setRegisterError("Les mots de passe ne correspondent pas");
      return;
    }
    
    register(registerData, {
      onError: (error: any) => {
        setRegisterError(error.message);
      }
    });
  };

  return (
    <div className="flex min-h-screen">
      {/* Formulaire d'authentification */}
      <div className="flex items-center justify-center w-full lg:w-1/2 p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                NoteGenius
              </span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Votre compagnon d'études intelligent
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="register">Inscription</TabsTrigger>
            </TabsList>
            
            {/* Onglet de connexion */}
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Connexion</CardTitle>
                  <CardDescription>
                    Connectez-vous à votre compte pour continuer
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleLoginSubmit}>
                  <CardContent className="space-y-4">
                    {loginError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{loginError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="votre@email.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Mot de passe</Label>
                        <a href="#" className="text-sm text-primary hover:underline">
                          Mot de passe oublié?
                        </a>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={isLoginLoading}>
                      {isLoginLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connexion...
                        </>
                      ) : (
                        "Se connecter"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
            
            {/* Onglet d'inscription */}
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Créer un compte</CardTitle>
                  <CardDescription>
                    Inscrivez-vous pour commencer à utiliser NoteGenius
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleRegisterSubmit}>
                  <CardContent className="space-y-4">
                    {registerError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{registerError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="username">Nom d'utilisateur</Label>
                      <Input
                        id="username"
                        placeholder="pseudo"
                        value={registerData.username}
                        onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Nom d'affichage (optionnel)</Label>
                      <Input
                        id="displayName"
                        placeholder="Comment souhaitez-vous être appelé"
                        value={registerData.displayName}
                        onChange={(e) => setRegisterData({ ...registerData, displayName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Mot de passe</Label>
                      <Input
                        id="register-password"
                        type="password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={isRegisterLoading}>
                      {isRegisterLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Inscription...
                        </>
                      ) : (
                        "S'inscrire"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Hero section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 to-blue-500/20 flex-col items-center justify-center p-12">
        <div className="max-w-xl space-y-8 text-center">
          <h2 className="text-4xl font-bold tracking-tight">
            Transformez vos études avec l'IA
          </h2>
          <p className="text-lg text-muted-foreground">
            NoteGenius utilise l'intelligence artificielle pour améliorer votre expérience d'apprentissage. Prenez des notes plus intelligentes, générez des quiz, créez des cartes mémoire et partagez vos connaissances avec vos camarades d'études.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="rounded-lg bg-white/20 backdrop-blur-sm p-4 shadow">
              <h3 className="font-semibold mb-2">Prise de notes intelligente</h3>
              <p className="text-sm">OCR pour capturer vos notes manuscrites et amélioration par IA</p>
            </div>
            <div className="rounded-lg bg-white/20 backdrop-blur-sm p-4 shadow">
              <h3 className="font-semibold mb-2">Révision espacée</h3>
              <p className="text-sm">Système de répétition optimisé pour une mémorisation efficace</p>
            </div>
            <div className="rounded-lg bg-white/20 backdrop-blur-sm p-4 shadow">
              <h3 className="font-semibold mb-2">Quiz et évaluations</h3>
              <p className="text-sm">Génération automatique de questions pour tester vos connaissances</p>
            </div>
            <div className="rounded-lg bg-white/20 backdrop-blur-sm p-4 shadow">
              <h3 className="font-semibold mb-2">Étude collaborative</h3>
              <p className="text-sm">Partagez et collaborez facilement avec vos camarades d'études</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}