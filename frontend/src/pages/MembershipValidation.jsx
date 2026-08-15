import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { CalendarCheck, Camera, CheckCircle2, ScanLine, ShieldX, Sparkles } from "lucide-react";
import PageCard from "@/components/PageCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { validateMembershipToken } from "@/lib/api";
import { formatDate } from "@/lib/constants";

function extractToken(value) {
  if (!value) {
    return "";
  }

  const trimmed = String(value).trim();

  try {
    const url = new URL(trimmed);
    return url.searchParams.get("token") ?? trimmed;
  } catch {
    return trimmed;
  }
}

function formatAttendanceTime(dateString) {
  if (!dateString) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function MembershipValidation() {
  const { logout } = useAuth();
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [token, setToken] = useState("");
  const [scanError, setScanError] = useState(null);
  const [scanMessage, setScanMessage] = useState("Activa la cámara para leer un QR de membresía.");
  const [result, setResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const handleUnauthorized = () => {
    logout();
  };

  const stopCamera = () => {
    readerRef.current?.reset?.();
    readerRef.current = null;
    setIsScanning(false);
  };

  const validateToken = async (rawToken) => {
    const nextToken = extractToken(rawToken);
    if (!nextToken) {
      setScanError("No se pudo leer un token válido.");
      return;
    }

    setIsValidating(true);
    setScanError(null);
    try {
      const response = await validateMembershipToken({ token: nextToken }, handleUnauthorized);
      setToken(nextToken);
      setResult(response);
      setScanMessage(response.valid ? "Token verificado y asistencia confirmada." : response.message);
    } catch (err) {
      setResult(null);
      setScanError(err instanceof Error ? err.message : "Error al validar el token");
    } finally {
      setIsValidating(false);
    }
  };

  const startCamera = async () => {
    if (!videoRef.current || isScanning) {
      return;
    }

    setScanError(null);
    setScanMessage("Buscando cámara...");
    setIsScanning(true);

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      await reader.decodeFromVideoDevice(undefined, videoRef.current, (decoded, error, controls) => {
        if (decoded) {
          controls.stop();
          stopCamera();
          validateToken(decoded.getText());
        }

        if (error && String(error).toLowerCase().includes("notfound")) {
          setScanMessage("Apunta la cámara hacia el QR de la membresía.");
        }
      });
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "No se pudo iniciar la cámara");
      stopCamera();
    }
  };

  useEffect(() => () => stopCamera(), []);

  const statusBadge = useMemo(() => {
    if (!result) {
      return null;
    }

    return result.valid ? (
      <Badge className="w-fit bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">
        Válido
      </Badge>
    ) : (
      <Badge variant="destructive" className="w-fit">
        Inválido
      </Badge>
    );
  }, [result]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <PageCard>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Camera className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Validación por cámara</h2>
              <p className="text-sm text-muted-foreground">
                Escanea el QR del usuario y valida el token contra el backend.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-black">
            <video ref={videoRef} className="h-[320px] w-full object-cover sm:h-[420px]" muted playsInline />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={startCamera} disabled={isScanning || isValidating}>
              <ScanLine className="size-4" />
              {isScanning ? "Escaneando..." : "Activar cámara"}
            </Button>
            <Button type="button" variant="outline" onClick={stopCamera} disabled={!isScanning}>
              Detener cámara
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manualToken">Validación manual</Label>
            <div className="flex gap-2">
              <Input
                id="manualToken"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Pega el token o un texto escaneado"
              />
              <Button type="button" onClick={() => validateToken(token)} disabled={isValidating}>
                Validar
              </Button>
            </div>
          </div>

          {scanMessage && <p className="text-sm text-muted-foreground">{scanMessage}</p>}
          {scanError && <p className="text-sm text-destructive">{scanError}</p>}
        </div>
      </PageCard>

      <PageCard title="Resultado">
        {result ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{result.clientName}</h3>
                <p className="text-sm text-muted-foreground">Plan {result.planName}</p>
              </div>
              {statusBadge}
            </div>

            <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 text-sm">
              <p>
                <span className="font-medium">Estado:</span> {result.message}
              </p>
              <p>
                <span className="font-medium">Vigencia:</span> {formatDate(result.startDate)} - {formatDate(result.endDate)}
              </p>
              <p>
                <span className="font-medium">Token:</span> <span className="break-all font-mono">{result.accessToken}</span>
              </p>
              {result.attendance && (
                <p>
                  <span className="font-medium">Asistencia:</span> Confirmada a las{" "}
                  {formatAttendanceTime(result.attendance.checkedInAt)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-dashed bg-background px-4 py-3 text-sm text-muted-foreground">
              {result.valid ? <CheckCircle2 className="size-4 text-emerald-600" /> : <ShieldX className="size-4 text-destructive" />}
              <span>
                {result.valid
                  ? "La membresía está habilitada para el acceso y la asistencia de hoy quedó confirmada."
                  : "La membresía existe, pero no está habilitada para acceso."}
              </span>
            </div>
            {result.attendance && (
              <div className="flex items-center gap-2 rounded-xl border bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
                <CalendarCheck className="size-4" />
                <span>
                  Registro de asistencia guardado
                  {result.attendance.registeredByName
                    ? ` por ${result.attendance.registeredByName}`
                    : ""}
                  .
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-6 text-center text-muted-foreground">
            <Sparkles className="size-8" />
            <p>La validación aparecerá aquí después de escanear un QR o ingresar un token.</p>
          </div>
        )}
      </PageCard>
    </div>
  );
}

export default MembershipValidation;
