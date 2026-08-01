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

  // Form
  const [mode, setMode] = useState<"cloud" | "edge">("cloud");
  const [provider, setProvider] = useState("openrouter");
  const [baseUrl, setBaseUrl] = useState("");
  const [modelName, setModelName] = useState("");
  const [qvacModelSrc, setQvacModelSrc] = useState("");

  // Connection test
  const [testing, setTesting] = useState(false);
  const [testElapsed, setTestElapsed] = useState(0);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    latencyMs?: number;
    model?: string;
    reply?: string;
    message?: string;
  } | null>(null);

  // Load the current config
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
          title: "Error",
          description: err.message || "Unable to load the LLM configuration",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [user, toast]);

  // Explanatory message if the test takes > 10 s (expected QVAC warm-up)
  useEffect(() => {
    if (!testing) {
      setTestElapsed(0);
      return;
    }
    const interval = setInterval(() => setTestElapsed((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [testing]);

  // While the session loads, we wait before displaying anything
  // (avoids a "Restricted access" flash for an admin who is still authenticating).
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
          <AlertTitle>Restricted access</AlertTitle>
          <AlertDescription>
            This page is reserved for instance administrators. The Cloud/Edge
            switch is an administration action.
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
        title: "Configuration saved",
        description: "Hot switch is active: the next LLM calls use the new provider.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Save failed",
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
        // QVAC warm-up can exceed 60 s (initial P2P download) — no client timeout.
        // retries: 0 → an abort/timeout surfaces immediately without 3 noisy retries
        // (apiRequest does not recognize AbortError and would retry 3x otherwise).
        signal: AbortSignal.timeout(320_000),
        retries: 0,
      });
      setTestResult(data);
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const showWarmupMessage = testing && isEdgeMode && testElapsed >= 10;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">LLM Administration</h1>
        <p className="text-muted-foreground">
          Choose the inference mode of this instance: cloud
          (OpenAI-compatible) or edge (local QVAC). Administration action —
          end users do not choose.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inference provider</CardTitle>
          <CardDescription>
            Current source:{" "}
            <Badge variant="secondary">{settings?.source ?? "env"}</Badge>
            {settings?.settings ? " (DB config, takes priority)" : " (LLM_PROVIDER environment variable, fallback)"}
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
                  OpenAI, OpenRouter, Grok, DeepSeek or any OpenAI-compatible endpoint
                </span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="edge" id="mode-edge" className="peer sr-only" />
              <Label
                htmlFor="mode-edge"
                className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <span className="text-lg font-semibold">💻 Edge (local QVAC)</span>
                <span className="text-xs text-muted-foreground text-center">
                  Inference on this machine via llama.cpp — no API key
                </span>
              </Label>
            </div>
          </RadioGroup>

          {!isEdgeMode ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cloud provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLOUD_PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p === "openai-compatible" ? "OpenAI-compatible endpoint (custom)" : p}
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
                    <Label htmlFor="modelName">Model name</Label>
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
                  <Label htmlFor="modelName">Model (optional — preset default)</Label>
                  <Input
                    id="modelName"
                    placeholder={provider === "openai" ? "gpt-4o-mini" : undefined}
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                  />
                </div>
              )}

              <Alert>
                <AlertTitle>API key</AlertTitle>
                <AlertDescription>
                  The cloud API key is read <strong>only</strong> from the
                  server environment variables (e.g. OPENROUTER_API_KEY,
                  OPENAI_API_KEY, XAI_API_KEY, DEEPSEEK_API_KEY, LLM_API_KEY) —
                  never stored in the database.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qvacModelSrc">QVAC model</Label>
                <Input
                  id="qvacModelSrc"
                  placeholder="LLAMA_3_2_1B_INST_Q4_0"
                  value={qvacModelSrc}
                  onChange={(e) => setQvacModelSrc(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Registry constant (LLAMA_3_2_1B_INST_Q4_0, QWEN3_600M_INST_Q4,
                  QWEN3_1_7B_INST_Q4) or URL / local path to a .gguf.
                </p>
              </div>
              <Alert>
                <AlertTitle>⚠️ Local model loading</AlertTitle>
                <AlertDescription>
                  The first call can take <strong>several tens of seconds, or
                  even a minute</strong>: loading the model into RAM
                  (and a P2P download on the very first start). Only switch to
                  Edge mode after validating the connection below.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Connection test */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-medium">Test the connection</h3>
                <p className="text-xs text-muted-foreground">
                  Sends a test prompt and shows the latency + a snippet of the response.
                </p>
              </div>
              <Button onClick={handleTest} disabled={testing || saving} variant="outline">
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <PlugZap className="mr-2 h-4 w-4" />
                    Test the connection
                  </>
                )}
              </Button>
            </div>

            {showWarmupMessage && (
              <Alert>
                <AlertTitle>Loading the local model...</AlertTitle>
                <AlertDescription>
                  This can take up to a minute the first time (loading the model
                  into RAM, or even the initial P2P download). Please wait.
                </AlertDescription>
              </Alert>
            )}

            {testResult && (
              <Alert variant={testResult.ok ? "default" : "destructive"}>
                <AlertTitle>
                  {testResult.ok
                    ? `✅ Connection OK — ${testResult.latencyMs} ms (${testResult.model})`
                    : "❌ Test failed"}
                </AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">
                  {testResult.ok
                    ? `Response: "${testResult.reply}"`
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
              Save and apply (hot switch)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
