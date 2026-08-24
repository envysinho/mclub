import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  CalendarCheck,
  Camera,
  CheckCircle2,
  LoaderCircle,
  RefreshCcw,
  ScanLine,
  ShieldX,
} from "lucide-react";
import PageCard from "@/components/PageCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { validateMembershipToken } from "@/lib/api";
import { formatDate } from "@/lib/constants";

const DUPLICATE_SCAN_WINDOW_MS = 4000;
const FRONT_CAMERA_CONSTRAINTS = {
  video: {
    facingMode: { exact: "user" },
  },
};

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
  if (!dateString) return "--";
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function MembershipQrContinuous() {
  const { logout } = useAuth();
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraSessionRef = useRef(0);
  const isStartingCameraRef = useRef(false);
  const isValidatingRef = useRef(false);
  const recentScanRef = useRef({ token: "", scannedAt: 0 });
  const [cameraError, setCameraError] = useState(null);
  const [scanMessage, setScanMessage] = useState("Iniciando cámara...");
  const [result, setResult] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const handleUnauthorized = useCallback(() => {
    logout();
  }, [logout]);

  const stopCamera = useCallback(() => {
    cameraSessionRef.current += 1;
    isStartingCameraRef.current = false;
    controlsRef.current?.stop?.();
    controlsRef.current = null;
    setIsScanning(false);
  }, []);

  const validateScannedValue = useCallback(
    async (rawValue) => {
      const nextToken = extractToken(rawValue);
      if (!nextToken) {
        setValidationError("No se pudo leer un token válido.");
        setScanMessage("Muestra nuevamente el QR frente a la cámara.");
        return;
      }

      const now = Date.now();
      const recentScan = recentScanRef.current;
      const isDuplicate =
        recentScan.token === nextToken &&
        now - recentScan.scannedAt < DUPLICATE_SCAN_WINDOW_MS;

      if (isValidatingRef.current || isDuplicate) {
        return;
      }

      recentScanRef.current = { token: nextToken, scannedAt: now };
      isValidatingRef.current = true;
      setIsValidating(true);
      setValidationError(null);
      setScanMessage("Validando membresía...");

      try {
        const response = await validateMembershipToken(
          { token: nextToken },
          handleUnauthorized
        );
        setResult(response);
        setScanMessage(
          response.valid
            ? "Acceso validado. Listo para el siguiente QR."
            : "QR leído. Revisa el estado de la membresía."
        );
      } catch (err) {
        setResult(null);
        setValidationError(
          err instanceof Error ? err.message : "Error al validar el token"
        );
        setScanMessage("No se pudo validar el QR. Listo para intentar de nuevo.");
      } finally {
        isValidatingRef.current = false;
        setIsValidating(false);
      }
    },
    [handleUnauthorized]
  );

  const startCamera = useCallback(async () => {
    if (!videoRef.current || controlsRef.current || isStartingCameraRef.current) {
      return;
    }

    const sessionId = cameraSessionRef.current + 1;
    cameraSessionRef.current = sessionId;
    isStartingCameraRef.current = true;
    setCameraError(null);
    setScanMessage("Buscando cámara...");

    try {
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromConstraints(
        FRONT_CAMERA_CONSTRAINTS,
        videoRef.current,
        (decoded, error) => {
          if (decoded) {
            validateScannedValue(decoded.getText());
            return;
          }

          if (error && String(error).toLowerCase().includes("notfound")) {
            setScanMessage((currentMessage) =>
              currentMessage === "Validando membresía..."
                ? currentMessage
                : "Apunta la cámara hacia el QR de la membresía."
            );
          }
        }
      );
      if (cameraSessionRef.current !== sessionId) {
        controls.stop();
        return;
      }

      controlsRef.current = controls;
      setIsScanning(true);
      setScanMessage("Apunta la cámara hacia el QR de la membresía.");
    } catch (error) {
      if (cameraSessionRef.current !== sessionId) {
        return;
      }

      controlsRef.current = null;
      setIsScanning(false);
      setCameraError(
        error instanceof Error ? error.message : "No se pudo iniciar la cámara"
      );
      setScanMessage("La cámara no está disponible.");
    } finally {
      if (cameraSessionRef.current === sessionId) {
        isStartingCameraRef.current = false;
      }
    }
  }, [validateScannedValue]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const statusBadge = useMemo(() => {
    if (!result) {
      return null;
    }

    return result.valid ? (
      <Badge className="h-7 bg-emerald-500/15 px-3 text-sm text-emerald-700 hover:bg-emerald-500/15">
        Válido
      </Badge>
    ) : (
      <Badge variant="destructive" className="h-7 px-3 text-sm">
        Inválido
      </Badge>
    );
  }, [result]);

  return (
    <PageCard>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-xl bg-primary/10 p-2 text-primary">
              <Camera className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold sm:text-xl">Asistencia</h2>
            </div>
          </div>
          <Badge
            className={
              isScanning
                ? "shrink-0 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15"
                : "shrink-0"
            }
            variant={isScanning ? "default" : "outline"}
          >
            {isScanning ? "Cámara activa" : "Sin cámara"}
          </Badge>
        </div>

        <div className="relative overflow-hidden rounded-2xl border bg-black">
          <video
            ref={videoRef}
            className="h-[340px] w-full object-cover sm:h-[560px]"
            muted
            playsInline
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-48 w-48 rounded-3xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.28)] sm:h-64 sm:w-64" />
          </div>
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/65 px-3 py-1 text-sm text-white">
            {isValidating ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ScanLine className="size-4" />
            )}
            <span>{isValidating ? "Validando" : "Escaneando"}</span>
          </div>
        </div>

        {result ? (
          <div className="rounded-xl border bg-background p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Cliente</p>
                <h3 className="break-words text-4xl font-semibold leading-tight">
                  {result.clientName}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {statusBadge}
                {result.valid ? (
                  <CheckCircle2 className="size-5 text-emerald-600" />
                ) : (
                  <ShieldX className="size-5 text-destructive" />
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
              <p>{result.message}</p>
              <p>Plan {result.planName}</p>
              <p>{formatDate(result.startDate)} - {formatDate(result.endDate)}</p>
              <p>
                {result.attendance
                  ? `Asistencia ${formatAttendanceTime(result.attendance.checkedInAt)}`
                  : "Asistencia pendiente"}
              </p>
            </div>

            {result.attendance && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
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
          <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-6 text-center text-muted-foreground">
            {validationError ? (
              <>
                <ShieldX className="size-10 text-destructive" />
                <div className="space-y-1">
                  <p className="font-medium text-destructive">{validationError}</p>
                  <p className="text-sm">Muestra otro QR o intenta nuevamente.</p>
                </div>
              </>
            ) : (
              <>
                <ScanLine className="size-10" />
                <p>La validación aparecerá al leer el primer QR.</p>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{scanMessage}</p>
          {cameraError && (
            <Button type="button" variant="outline" size="sm" onClick={startCamera}>
              <RefreshCcw className="size-4" />
              Reintentar
            </Button>
          )}
        </div>

        {cameraError && <p className="text-sm text-destructive">{cameraError}</p>}
      </div>
    </PageCard>
  );
}

export default MembershipQrContinuous;
