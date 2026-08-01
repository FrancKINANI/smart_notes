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

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Redirect to="/" />;
  }

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    
    if (!loginData.email || !loginData.password) {
      setLoginError("Please fill in all fields");
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
      setRegisterError("Please fill in all required fields");
      return;
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      setRegisterError("Passwords do not match");
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
      {/* Authentication form */}
      <div className="flex items-center justify-center w-full lg:w-1/2 p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                NoteGenius
              </span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Your intelligent study companion
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Log in</TabsTrigger>
              <TabsTrigger value="register">Sign up</TabsTrigger>
            </TabsList>
            
            {/* Login tab */}
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Log in</CardTitle>
                  <CardDescription>
                    Log in to your account to continue
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
                        placeholder="your@email.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <a href="#" className="text-sm text-primary hover:underline">
                          Forgot password?
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
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging in...
                        </>
                      ) : (
                        "Log in"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
            
            {/* Sign up tab */}
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>
                    Sign up to start using NoteGenius
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
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        placeholder="username"
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
                        placeholder="your@email.com"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display name (optional)</Label>
                      <Input
                        id="displayName"
                        placeholder="What would you like to be called"
                        value={registerData.displayName}
                        onChange={(e) => setRegisterData({ ...registerData, displayName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm password</Label>
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
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing up...
                        </>
                      ) : (
                        "Sign up"
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
            Transform your studies with AI
          </h2>
          <p className="text-lg text-muted-foreground">
            NoteGenius uses artificial intelligence to improve your learning experience. Take smarter notes, generate quizzes, create flashcards and share your knowledge with your study buddies.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="rounded-lg bg-white/20 backdrop-blur-sm p-4 shadow">
              <h3 className="font-semibold mb-2">Smart note taking</h3>
              <p className="text-sm">OCR to capture your handwritten notes and AI improvement</p>
            </div>
            <div className="rounded-lg bg-white/20 backdrop-blur-sm p-4 shadow">
              <h3 className="font-semibold mb-2">Spaced repetition</h3>
              <p className="text-sm">Optimized repetition system for effective memorization</p>
            </div>
            <div className="rounded-lg bg-white/20 backdrop-blur-sm p-4 shadow">
              <h3 className="font-semibold mb-2">Quizzes and assessments</h3>
              <p className="text-sm">Automatic question generation to test your knowledge</p>
            </div>
            <div className="rounded-lg bg-white/20 backdrop-blur-sm p-4 shadow">
              <h3 className="font-semibold mb-2">Collaborative study</h3>
              <p className="text-sm">Share and collaborate easily with your study buddies</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
