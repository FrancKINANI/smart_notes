import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlugZap, Save, ShieldAlert } from "lucide-react";

interface LlmSettingsResponse {
  settings: {
    provider: string;
    baseUrl: string | null;
    modelName: string | null;
    qvacModelSrc: string | null;
  } | null;
  active: {
    provider: string;
    baseUrl: string | null;
    modelName: string | null;
    qvacModelSrc: string | null;
  };
  source: "database" | "env";
  providers: string[];
}

const CLOUD_PROVIDERS = ["openai", "openrouter", "grok", "deepseek", "openai-compatible"];

export default function AdminPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState<LlmSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Formulaire
  const [mode, setMode] = useState<"cloud" | "edge">("cloud");
  const [provider, setProvider] = useState("openrouter");
  const [baseUrl, setBaseUrl] = useState("");
  const [modelName, setModelName] = useState("");
  const [qvacModelSrc, setQvacModelSrc] = useState("");

  // Test de connexion
  const [testing, setTesting] = useState(false);
  const [testElapsed, setTestElapsed] = useState(0);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    latencyMs?: number;
    model?: string;
    reply?: string;
    message?: string;
  } | null>(null);

  // Charger la config actuelle
  useEffect(() => {
    if (user?.role !== "admin") return;
    api
      .get("/api/admin/llm-settings")
      .then((data: LlmSettingsResponse) => {
        setSettings(data);
        const active = data.active;
        const isEdge = active.provider === "qvac";
        setMode(isEdge ? "edge" : "cloud");
        setProvider(active.provider);
        setBaseUrl(active.baseUrl || "");
        setModelName(active.modelName || "");
        setQvacModelSrc(active.qvacModelSrc || "");
      })
      .catch((err) => {
        toast({
          title: "Erreur",
          description: err.message || "Impossible de charger la configuration LLM",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [user, toast]);

  // Message explicatif si le test dure > 10 s (warm-up QVAC attendu)
  useEffect(() => {
    if (!testing) {
      setTestElapsed(0);
      return;
    }
    const interval = setInterval(() => setTestElapsed((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [testing]);

  // Pendant le chargement de la session, on attend avant d'afficher quoi que
  // ce soit (évite un flash « Accès réservé » pour un admin en cours d'auth).
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Accès réservé</AlertTitle>
          <AlertDescription>
            Cette page est réservée aux administrateurs de l'instance. La
            bascule Cloud/Edge est une action d'administration.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isEdgeMode = mode === "edge";
  const isCustomEndpoint = provider === "openai-compatible";

  const buildPayload = () => ({
    provider: isEdgeMode ? "qvac" : provider,
    baseUrl: isEdgeMode ? null : baseUrl || null,
    modelName: isEdgeMode ? null : modelName || null,
    qvacModelSrc: isEdgeMode ? qvacModelSrc || null : null,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await api.put("/api/admin/llm-settings", buildPayload());
      setSettings((prev) =>
        prev ? { ...prev, settings: data.settings, source: "database", active: { ...data.settings } } : prev
      );
      toast({
        title: "Configuration enregistrée",
        description: "La bascule à chaud est active : les prochains appels LLM utilisent le nouveau provider.",
      });
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Échec de l'enregistrement",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const data = await api.post("/api/admin/llm-settings/test", buildPayload(), {
        // Le warm-up QVAC peut dépasser 60 s (téléchargement P2P initial) — pas de timeout client.
        // retries: 0 → un abort/timeout remonte immédiatement sans 3 retries bruyants
        // (apiRequest ne reconnaît pas AbortError et relancerait 3× sinon).
        signal: AbortSignal.timeout(320_000),
        retries: 0,
      });
      setTestResult(data);
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Échec du test",
      });
    } finally {
      setTesting(false);
    }
  };

  const showWarmupMessage = testing && isEdgeMode && testElapsed >= 10;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Administration LLM</h1>
        <p className="text-muted-foreground">
          Choisissez le mode d'inférence de cette instance : cloud
          (OpenAI-compatible) ou edge (QVAC local). Action d'administration —
          les utilisateurs finaux ne choisissent pas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fournisseur d'inférence</CardTitle>
          <CardDescription>
            Source actuelle :{" "}
            <Badge variant="secondary">{settings?.source ?? "env"}</Badge>
            {settings?.settings ? " (config en base, prioritaire)" : " (variable d'environnement LLM_PROVIDER, fallback)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as "cloud" | "edge")}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div>
              <RadioGroupItem value="cloud" id="mode-cloud" className="peer sr-only" />
              <Label
                htmlFor="mode-cloud"
                className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <span className="text-lg font-semibold">☁️ Cloud</span>
                <span className="text-xs text-muted-foreground text-center">
                  OpenAI, OpenRouter, Grok, DeepSeek ou tout endpoint OpenAI-compatible
                </span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="edge" id="mode-edge" className="peer sr-only" />
              <Label
                htmlFor="mode-edge"
                className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <span className="text-lg font-semibold">💻 Edge (QVAC local)</span>
                <span className="text-xs text-muted-foreground text-center">
                  Inférence sur cette machine via llama.cpp — aucune clé API
                </span>
              </Label>
            </div>
          </RadioGroup>

          {!isEdgeMode ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Provider cloud</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLOUD_PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p === "openai-compatible" ? "Endpoint OpenAI-compatible (custom)" : p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isCustomEndpoint && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="baseUrl">Base URL</Label>
                    <Input
                      id="baseUrl"
                      placeholder="https://api.mistral.ai/v1"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modelName">Nom du modèle</Label>
                    <Input
                      id="modelName"
                      placeholder="mistral-medium"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                    />
                  </div>
                </>
              )}

              {!isCustomEndpoint && (
                <div className="space-y-2">
                  <Label htmlFor="modelName">Modèle (optionnel — défaut du preset)</Label>
                  <Input
                    id="modelName"
                    placeholder={provider === "openai" ? "gpt-4o-mini" : undefined}
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                  />
                </div>
              )}

              <Alert>
                <AlertTitle>Clé API</AlertTitle>
                <AlertDescription>
                  La clé API cloud est lue <strong>uniquement</strong> depuis les
                  variables d'environnement du serveur (ex: OPENROUTER_API_KEY,
                  OPENAI_API_KEY, XAI_API_KEY, DEEPSEEK_API_KEY, LLM_API_KEY) —
                  jamais stockée en base de données.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qvacModelSrc">Modèle QVAC</Label>
                <Input
                  id="qvacModelSrc"
                  placeholder="LLAMA_3_2_1B_INST_Q4_0"
                  value={qvacModelSrc}
                  onChange={(e) => setQvacModelSrc(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Constante du registry (LLAMA_3_2_1B_INST_Q4_0, QWEN3_600M_INST_Q4,
                  QWEN3_1_7B_INST_Q4) ou URL / chemin local vers un .gguf.
                </p>
              </div>
              <Alert>
                <AlertTitle>⚠️ Chargement du modèle local</AlertTitle>
                <AlertDescription>
                  Le premier appel peut prendre <strong>plusieurs dizaines de
                  secondes, voire une minute</strong> : chargement du modèle en RAM
                  (et téléchargement P2P au tout premier démarrage). Ne basculez en
                  mode Edge qu'après avoir validé la connexion ci-dessous.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Test de connexion */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-medium">Tester la connexion</h3>
                <p className="text-xs text-muted-foreground">
                  Envoie un prompt de test et affiche la latence + un extrait de la réponse.
                </p>
              </div>
              <Button onClick={handleTest} disabled={testing || saving} variant="outline">
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Test en cours…
                  </>
                ) : (
                  <>
                    <PlugZap className="mr-2 h-4 w-4" />
                    Tester la connexion
                  </>
                )}
              </Button>
            </div>

            {showWarmupMessage && (
              <Alert>
                <AlertTitle>Chargement du modèle local…</AlertTitle>
                <AlertDescription>
                  Ça peut prendre jusqu'à une minute la première fois (chargement
                  du modèle en RAM, voire téléchargement P2P initial). Merci de patienter.
                </AlertDescription>
              </Alert>
            )}

            {testResult && (
              <Alert variant={testResult.ok ? "default" : "destructive"}>
                <AlertTitle>
                  {testResult.ok
                    ? `✅ Connexion OK — ${testResult.latencyMs} ms (${testResult.model})`
                    : "❌ Échec du test"}
                </AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">
                  {testResult.ok
                    ? `Réponse : « ${testResult.reply} »`
                    : testResult.message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex justify-end border-t pt-4">
            <Button onClick={handleSave} disabled={saving || testing}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Enregistrer et appliquer (bascule à chaud)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
