import { useRef, useState } from "react";
import { ClipboardCopy, Download, SendHorizontal } from "lucide-react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/constants";

const QR_IMAGE_SIZE = 240;
const QR_CODE_SIZE = 208;
const QR_IMAGE_PADDING = (QR_IMAGE_SIZE - QR_CODE_SIZE) / 2;

function normalizeWhatsappPhone(phone) {
  if (!phone) {
    return null;
  }

  const digits = String(phone).replace(/\D/g, "");

  if (digits.length === 9) {
    return `51${digits}`;
  }

  if (digits.startsWith("51") && digits.length >= 11) {
    return digits;
  }

  return null;
}

function MembershipQrCard({ membership, onCopyToken, onCreateQrLink }) {
  const qrRef = useRef(null);
  const [shareStatus, setShareStatus] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const accessToken = String(membership?.accessToken || membership?.qrPayload || "").trim();
  const qrPayload = String(membership?.qrPayload || accessToken).trim();
  const isValid = membership?.valid ?? Boolean(qrPayload);
  const whatsappPhone = normalizeWhatsappPhone(membership?.clientPhone);

  const buildShareMessage = (downloadUrl) => {
    if (!membership) {
      return "";
    }

    return [
      `Bienvenido! a M Club Gym, ${membership.clientName}.`,
      `Tu membresía está vigente desde ${formatDate(membership.startDate)} hasta ${formatDate(membership.endDate)}.`,
      `Aquí el link para que veas y bajes tu QR: ${downloadUrl}`,
      "Este link solo dura 15 minutos.",
    ].join("\n");
  };

  const buildWhatsappUrl = (downloadUrl) => {
    const text = encodeURIComponent(buildShareMessage(downloadUrl));
    return whatsappPhone ? `https://wa.me/${whatsappPhone}?text=${text}` : `https://wa.me/?text=${text}`;
  };

  const getQrSvgText = () => {
    if (!qrRef.current || !membership) {
      return "";
    }

    const svg = qrRef.current.querySelector("svg");
    if (!svg) {
      return "";
    }

    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(QR_CODE_SIZE));
    clone.setAttribute("height", String(QR_CODE_SIZE));

    const serializer = new XMLSerializer();
    return serializer.serializeToString(clone);
  };

  const createQrPngFile = async () => {
    const svgText = getQrSvgText();
    if (!svgText) {
      return null;
    }

    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
      const image = new Image();
      image.decoding = "async";
      const imageLoaded = new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });
      image.src = svgUrl;
      await imageLoaded;

      const canvas = document.createElement("canvas");
      canvas.width = QR_IMAGE_SIZE;
      canvas.height = QR_IMAGE_SIZE;
      const context = canvas.getContext("2d");
      if (!context) {
        return null;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, QR_IMAGE_SIZE, QR_IMAGE_SIZE);
      context.drawImage(image, QR_IMAGE_PADDING, QR_IMAGE_PADDING, QR_CODE_SIZE, QR_CODE_SIZE);

      const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!pngBlob) {
        return null;
      }

      return new File([pngBlob], `membresia-${membership.membershipId}.png`, { type: "image/png" });
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

  const downloadQr = () => {
    const svgText = getQrSvgText();
    if (!svgText) {
      return;
    }

    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(blob, `membresia-${membership.membershipId}.svg`);
  };

  const sendByWhatsapp = async () => {
    setShareStatus("");
    setIsSharing(true);
    const whatsappWindow = window.open("about:blank", "_blank");
    if (whatsappWindow) {
      whatsappWindow.opener = null;
    }

    try {
      const qrFile = await createQrPngFile();
      if (!qrFile) {
        throw new Error("No se pudo generar la imagen del QR");
      }

      const imageBase64 = await blobToDataUrl(qrFile);
      const response = await onCreateQrLink?.(membership.membershipId, {
        accessToken,
        filename: qrFile.name,
        imageBase64,
      });

      if (!response?.downloadUrl) {
        throw new Error("No se pudo generar el link temporal del QR");
      }

      const whatsappUrl = buildWhatsappUrl(response.downloadUrl);
      if (whatsappWindow) {
        whatsappWindow.location.href = whatsappUrl;
      }
      setShareStatus(
        whatsappWindow
          ? "WhatsApp se abrió con el link temporal del QR."
          : "Activa las ventanas emergentes para abrir WhatsApp. El link temporal del QR ya fue generado."
      );
    } catch (err) {
      if (err?.name === "AbortError") {
        return;
      }
      if (whatsappWindow) {
        whatsappWindow.close();
      }
      setShareStatus(
        err instanceof Error ? err.message : "No se pudo preparar el envío por WhatsApp."
      );
    } finally {
      setIsSharing(false);
    }
  };

  if (!membership) {
    return null;
  }

  if (!qrPayload) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        No se pudo generar el QR porque la membresía no tiene token de acceso.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-background p-4">
      <div className="flex justify-center" ref={qrRef}>
        <div className="flex size-60 shrink-0 items-center justify-center rounded-2xl bg-white p-4 shadow-sm ring-1 ring-border">
          <QRCode
            value={qrPayload}
            size={QR_CODE_SIZE}
            bgColor="#ffffff"
            fgColor="#0a0d12"
            style={{ height: `${QR_CODE_SIZE}px`, width: `${QR_CODE_SIZE}px` }}
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm space-y-3">
        <div className="space-y-1 text-center">
          <Badge variant={isValid ? "default" : "destructive"} className="mx-auto w-fit">
            {isValid ? "Token activo" : "Token no válido"}
          </Badge>
          <h3 className="text-lg font-semibold leading-tight">{membership.clientName}</h3>
          <p className="text-sm text-muted-foreground">Plan {membership.planName}</p>
          <p className="text-sm text-muted-foreground">
            Vigencia: {formatDate(membership.startDate)} - {formatDate(membership.endDate)}
          </p>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Token</p>
          <p className="mt-1 break-all text-sm font-mono">{accessToken}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" variant="outline" onClick={() => onCopyToken?.(accessToken)}>
            <ClipboardCopy className="size-4" />
            Copiar token
          </Button>
          <Button type="button" variant="outline" onClick={downloadQr}>
            <Download className="size-4" />
            Descargar QR
          </Button>
          <Button type="button" onClick={sendByWhatsapp} disabled={isSharing}>
            <SendHorizontal className="size-4" />
            Enviar
          </Button>
        </div>
        {shareStatus ? (
          <p className="text-center text-xs text-muted-foreground">{shareStatus}</p>
        ) : null}
      </div>
    </div>
  );
}

export default MembershipQrCard;
