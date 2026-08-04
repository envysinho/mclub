package com.example.gym.controller;

import java.time.Duration;
import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;

import com.example.gym.dto.AssignMembershipRequest;
import com.example.gym.dto.CreateMembershipQrLinkRequest;
import com.example.gym.dto.CreateMembershipPlanRequest;
import com.example.gym.dto.MembershipAssignmentResponse;
import com.example.gym.dto.MembershipPlanResponse;
import com.example.gym.dto.MembershipQrLinkResponse;
import com.example.gym.dto.MembershipValidationResponse;
import com.example.gym.dto.ValidateMembershipTokenRequest;
import com.example.gym.dto.UpdateMembershipPlanRequest;
import com.example.gym.security.UserPrincipal;
import com.example.gym.service.MembershipQrDownloadService;
import com.example.gym.service.MembershipService;
import com.example.gym.service.DeleteConfirmationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class MembershipController {

    private final MembershipService membershipService;
    private final DeleteConfirmationService deleteConfirmationService;
    private final MembershipQrDownloadService membershipQrDownloadService;

    public MembershipController(
            MembershipService membershipService,
            DeleteConfirmationService deleteConfirmationService,
            MembershipQrDownloadService membershipQrDownloadService) {
        this.membershipService = membershipService;
        this.deleteConfirmationService = deleteConfirmationService;
        this.membershipQrDownloadService = membershipQrDownloadService;
    }

    @GetMapping("/membership-plans")
    public List<MembershipPlanResponse> listPlans() {
        return membershipService.findAllPlans();
    }

    @PostMapping("/membership-plans")
    @ResponseStatus(HttpStatus.CREATED)
    public MembershipPlanResponse createPlan(@Valid @RequestBody CreateMembershipPlanRequest request) {
        return membershipService.createPlan(request);
    }

    @PutMapping("/membership-plans/{id}")
    public MembershipPlanResponse updatePlan(
            @PathVariable("id") Long id,
            @Valid @RequestBody UpdateMembershipPlanRequest request) {
        return membershipService.updatePlan(id, request);
    }

    @DeleteMapping("/membership-plans/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePlan(
            @PathVariable("id") Long id,
            @RequestHeader(name = "X-Confirm-Password", required = false) String confirmationPassword,
            Authentication authentication) {
        deleteConfirmationService.verify(authentication, confirmationPassword);
        membershipService.deletePlan(id);
    }

    @PostMapping("/memberships")
    @ResponseStatus(HttpStatus.CREATED)
    public MembershipAssignmentResponse assignMembership(@Valid @RequestBody AssignMembershipRequest request, Authentication authentication) {
        return membershipService.assignMembership(request, authenticatedUser(authentication));
    }

    @PostMapping("/memberships/validate")
    public MembershipValidationResponse validateToken(@Valid @RequestBody ValidateMembershipTokenRequest request) {
        return membershipService.validateMembershipToken(request.token());
    }

    @PostMapping("/memberships/{membershipId}/qr-download-links")
    @ResponseStatus(HttpStatus.CREATED)
    public MembershipQrLinkResponse createQrDownloadLink(
            @PathVariable("membershipId") Long membershipId,
            @Valid @RequestBody CreateMembershipQrLinkRequest request) {
        return membershipQrDownloadService.createDownloadLink(membershipId, request);
    }

    @GetMapping(value = "/membership-qr/{downloadToken}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> showQrPage(@PathVariable("downloadToken") String downloadToken) {
        MembershipQrDownloadService.QrDownload download = membershipQrDownloadService.getDownload(downloadToken);
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(buildQrPage(downloadToken, download.filename(), download.clientName()));
    }

    @GetMapping(value = "/membership-qr/{downloadToken}/image", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> showQrImage(@PathVariable("downloadToken") String downloadToken) {
        MembershipQrDownloadService.QrDownload download = membershipQrDownloadService.getDownload(downloadToken);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(15)).cachePrivate())
                .contentType(MediaType.IMAGE_PNG)
                .body(download.imageBytes());
    }

    @GetMapping(value = "/membership-qr/{downloadToken}/download", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> downloadQr(@PathVariable("downloadToken") String downloadToken) {
        MembershipQrDownloadService.QrDownload download = membershipQrDownloadService.getDownload(downloadToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + download.filename() + "\"")
                .contentType(MediaType.IMAGE_PNG)
                .body(download.imageBytes());
    }

    @GetMapping(value = "/membership-qr/{downloadToken}/rules", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> showRulesPage(@PathVariable("downloadToken") String downloadToken) {
        MembershipQrDownloadService.QrDownload download = membershipQrDownloadService.getDownload(downloadToken);
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(buildRulesPage(downloadToken));
    }

    private String buildQrPage(String downloadToken, String filename, String clientName) {
        String safeToken = HtmlUtils.htmlEscape(downloadToken);
        String safeClientName = HtmlUtils.htmlEscape(clientName);
        String imageUrl = "/api/membership-qr/" + safeToken + "/image";
        String rulesUrl = "/api/membership-qr/" + safeToken + "/rules";

        return """
                <!doctype html>
                <html lang="es">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>QR de acceso - M Club Gym</title>
                  <link rel="preload" as="image" href="{{IMAGE_URL}}">
                  <style>
                    :root {
                      color-scheme: light;
                      --background: oklch(0.985 0 0);
                      --foreground: oklch(0.145 0 0);
                      --card: oklch(1 0 0);
                      --card-foreground: oklch(0.145 0 0);
                      --primary: oklch(0.205 0 0);
                      --primary-foreground: oklch(0.985 0 0);
                      --muted: oklch(0.97 0 0);
                      --muted-foreground: oklch(0.556 0 0);
                      --border: oklch(0.922 0 0);
                      --input: oklch(0.922 0 0);
                      --ring: oklch(0.708 0 0);
                      --radius: 0.625rem;
                      font-family: "Geist", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                      background: var(--background);
                      color: var(--foreground);
                    }

                    * {
                      box-sizing: border-box;
                    }

                    html {
                      -webkit-font-smoothing: antialiased;
                      text-rendering: geometricPrecision;
                    }

                    body {
                      min-height: 100vh;
                      margin: 0;
                      display: grid;
                      place-items: center;
                      padding: 24px;
                      background: var(--background);
                      color: var(--foreground);
                    }

                    main {
                      width: min(100%, 408px);
                      border: 1px solid var(--border);
                      border-radius: calc(var(--radius) + 4px);
                      padding: 24px;
                      background: var(--card);
                      color: var(--card-foreground);
                      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), 0 16px 36px rgba(0, 0, 0, 0.06);
                      text-align: center;
                    }

                    h1 {
                      margin: 0;
                      font-size: clamp(26px, 7vw, 32px);
                      line-height: 1.12;
                      letter-spacing: 0;
                      font-weight: 700;
                      color: var(--foreground);
                    }

                    .client-name {
                      display: inline;
                    }

                    p {
                      margin: 10px auto 0;
                      max-width: 310px;
                      color: var(--muted-foreground);
                      font-size: 15px;
                      line-height: 1.5;
                    }

                    .qr-frame {
                      margin: 24px auto 20px;
                      width: min(100%, 316px);
                      aspect-ratio: 1;
                      display: grid;
                      place-items: center;
                      position: relative;
                      overflow: hidden;
                      border-radius: calc(var(--radius) - 2px);
                      border: 1px solid var(--input);
                      background: #ffffff;
                      padding: 16px;
                      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.02);
                    }

                    img {
                      width: 100%;
                      height: 100%;
                      object-fit: contain;
                      transition: filter 160ms ease, opacity 160ms ease;
                    }

                    main[data-unlocked="false"] img {
                      filter: blur(8px);
                      opacity: 0.35;
                    }

                    .lock-layer {
                      position: absolute;
                      inset: 0;
                      display: grid;
                      place-items: center;
                      padding: 22px;
                      background: rgba(255, 255, 255, 0.58);
                      backdrop-filter: blur(1px);
                      color: var(--foreground);
                    }

                    main[data-unlocked="true"] .lock-layer {
                      display: none;
                    }

                    .lock-content {
                      display: grid;
                      justify-items: center;
                      gap: 8px;
                      max-width: 210px;
                      font-size: 14px;
                      font-weight: 600;
                      line-height: 1.35;
                    }

                    .lock-icon {
                      display: grid;
                      place-items: center;
                      width: 42px;
                      height: 42px;
                      border: 1px solid var(--border);
                      border-radius: 999px;
                      background: var(--card);
                      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                    }

                    .lock-icon svg {
                      width: 20px;
                      height: 20px;
                    }

                    .actions {
                      display: grid;
                      grid-template-columns: 1fr 1fr;
                      gap: 8px;
                    }

                    a,
                    button {
                      display: inline-flex;
                      align-items: center;
                      justify-content: center;
                      min-height: 44px;
                      width: 100%;
                      border: 1px solid var(--primary);
                      border-radius: var(--radius);
                      background: var(--primary);
                      color: var(--primary-foreground);
                      text-decoration: none;
                      font-weight: 600;
                      font-size: 14px;
                      font-family: inherit;
                      transition: opacity 120ms ease, transform 120ms ease;
                      cursor: pointer;
                    }

                    .secondary {
                      border-color: var(--border);
                      background: var(--card);
                      color: var(--foreground);
                      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
                    }

                    a:focus-visible,
                    button:focus-visible {
                      outline: 2px solid var(--ring);
                      outline-offset: 2px;
                    }

                    a:hover,
                    button:hover {
                      opacity: 0.9;
                    }

                    a:active,
                    button:active {
                      transform: translateY(1px);
                    }

                    button:disabled {
                      opacity: 0.5;
                      cursor: not-allowed;
                    }

                    button:disabled:active {
                      transform: none;
                    }

                    .notice {
                      display: none;
                      margin: 14px 0 0;
                      border: 1px solid var(--border);
                      border-radius: var(--radius);
                      padding: 12px;
                      background: var(--muted);
                      color: var(--muted-foreground);
                      font-size: 13px;
                      line-height: 1.45;
                    }

                    .notice[data-visible="true"] {
                      display: block;
                    }

                    @media (max-width: 420px) {
                      main {
                        padding: 20px;
                      }

                      .qr-frame {
                        width: min(100%, 300px);
                        padding: 14px;
                      }

                      .actions {
                        grid-template-columns: 1fr;
                      }
                    }
                  </style>
                </head>
                <body>
                  <main id="qr-card" data-unlocked="false">
                    <h1>Bienvenido(a) <span class="client-name">{{CLIENT_NAME}}</span></h1>
                    <p id="qr-instruction">Lee las reglas para obtener tu QR.</p>
                    <div class="qr-frame">
                      <img src="{{IMAGE_URL}}" alt="QR de acceso" width="284" height="284" loading="eager" decoding="sync" fetchpriority="high">
                      <div class="lock-layer" aria-hidden="true">
                        <div class="lock-content">
                          <div class="lock-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                          </div>
                          <span>Lee las reglas para obtener tu QR</span>
                        </div>
                      </div>
                    </div>
                    <div class="actions">
                      <a class="secondary" href="{{RULES_URL}}">Lee las reglas</a>
                      <button id="confirm-button" type="button" disabled>Entendido</button>
                    </div>
                    <p class="notice" id="capture-notice">Recuerda tomar una captura porque este link solo dura 15 minutos.</p>
                  </main>
                  <script>
                    const rulesKey = "mclub-rules-{{TOKEN}}";
                    const qrCard = document.getElementById("qr-card");
                    const qrInstruction = document.getElementById("qr-instruction");
                    const confirmButton = document.getElementById("confirm-button");
                    const captureNotice = document.getElementById("capture-notice");
                    const rulesAccepted = localStorage.getItem(rulesKey) === "accepted";

                    if (rulesAccepted) {
                      qrCard?.setAttribute("data-unlocked", "true");
                      if (qrInstruction) {
                        qrInstruction.textContent = "Toma una captura de tu QR de acceso.";
                      }
                      if (confirmButton) {
                        confirmButton.disabled = false;
                      }
                    }

                    confirmButton?.addEventListener("click", () => {
                      if (!rulesAccepted) {
                        return;
                      }
                      captureNotice?.setAttribute("data-visible", "true");
                    });
                  </script>
                </body>
                </html>
                """
                .replace("{{CLIENT_NAME}}", safeClientName)
                .replace("{{IMAGE_URL}}", imageUrl)
                .replace("{{RULES_URL}}", rulesUrl)
                .replace("{{TOKEN}}", safeToken);
    }

    private String buildRulesPage(String downloadToken) {
        String safeToken = HtmlUtils.htmlEscape(downloadToken);
        String qrUrl = "/api/membership-qr/" + safeToken;

        return """
                <!doctype html>
                <html lang="es">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>Reglas - M Club Gym</title>
                  <style>
                    :root {
                      color-scheme: light;
                      --background: oklch(0.985 0 0);
                      --foreground: oklch(0.145 0 0);
                      --card: oklch(1 0 0);
                      --card-foreground: oklch(0.145 0 0);
                      --muted: oklch(0.97 0 0);
                      --muted-foreground: oklch(0.556 0 0);
                      --border: oklch(0.922 0 0);
                      --input: oklch(0.922 0 0);
                      --primary: oklch(0.205 0 0);
                      --primary-foreground: oklch(0.985 0 0);
                      --ring: oklch(0.708 0 0);
                      --radius: 0.625rem;
                      font-family: "Geist", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    }

                    * {
                      box-sizing: border-box;
                    }

                    html {
                      -webkit-font-smoothing: antialiased;
                      text-rendering: geometricPrecision;
                    }

                    body {
                      min-height: 100vh;
                      margin: 0;
                      display: grid;
                      place-items: center;
                      padding: 24px;
                      background: var(--background);
                      color: var(--foreground);
                    }

                    main {
                      width: min(100%, 560px);
                      border: 1px solid var(--border);
                      border-radius: calc(var(--radius) + 4px);
                      padding: 20px;
                      background: var(--card);
                      color: var(--card-foreground);
                      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), 0 16px 36px rgba(0, 0, 0, 0.06);
                    }

                    h1 {
                      margin: 0;
                      font-size: clamp(24px, 7vw, 32px);
                      line-height: 1.12;
                      letter-spacing: 0;
                      font-weight: 700;
                    }

                    p {
                      margin: 8px 0 0;
                      color: var(--muted-foreground);
                      font-size: 14px;
                      line-height: 1.45;
                    }

                    .rules-list {
                      display: grid;
                      gap: 6px;
                      margin: 16px 0;
                    }

                    .rule-item {
                      display: grid;
                      grid-template-columns: 18px 1fr;
                      gap: 10px;
                      align-items: start;
                      border: 1px solid var(--border);
                      border-radius: var(--radius);
                      padding: 8px 10px;
                      background: var(--card);
                      color: var(--foreground);
                      font-size: 12px;
                      line-height: 1.32;
                      cursor: pointer;
                      transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
                    }

                    .rule-item:hover {
                      background: var(--muted);
                    }

                    .rule-item:has(input:checked) {
                      border-color: var(--primary);
                      background: var(--muted);
                    }

                    input {
                      width: 16px;
                      height: 16px;
                      margin: 0;
                      appearance: none;
                      display: grid;
                      place-items: center;
                      border: 1px solid var(--input);
                      border-radius: 4px;
                      background: var(--card);
                      accent-color: var(--primary);
                      cursor: pointer;
                    }

                    input:focus-visible {
                      outline: 2px solid var(--ring);
                      outline-offset: 2px;
                    }

                    input:checked {
                      border-color: var(--primary);
                      background: var(--primary);
                    }

                    input:checked::after {
                      content: "";
                      width: 8px;
                      height: 5px;
                      border-left: 2px solid var(--primary-foreground);
                      border-bottom: 2px solid var(--primary-foreground);
                      transform: translateY(-1px) rotate(-45deg);
                    }

                    button {
                      display: inline-flex;
                      align-items: center;
                      justify-content: center;
                      min-height: 44px;
                      width: 100%;
                      border: 1px solid var(--primary);
                      border-radius: var(--radius);
                      background: var(--primary);
                      color: var(--primary-foreground);
                      text-decoration: none;
                      font-weight: 600;
                      font-size: 14px;
                      font-family: inherit;
                      cursor: pointer;
                      transition: opacity 120ms ease, transform 120ms ease;
                    }

                    button:disabled {
                      opacity: 0.5;
                      cursor: not-allowed;
                    }

                    button:not(:disabled):hover {
                      opacity: 0.9;
                    }

                    button:not(:disabled):active {
                      transform: translateY(1px);
                    }

                    button:focus-visible {
                      outline: 2px solid var(--ring);
                      outline-offset: 2px;
                    }

                    @media (max-width: 520px) {
                      body {
                        padding: 16px;
                      }

                      main {
                        padding: 16px;
                      }

                      h1 {
                        font-size: 24px;
                      }

                      .rule-item {
                        font-size: 11.5px;
                        padding: 7px 8px;
                      }
                    }
                  </style>
                </head>
                <body>
                  <main>
                    <h1>Reglas M Club Gym</h1>
                    <p>Marca cada regla para habilitar tu QR de acceso.</p>
                    <div class="rules-list">
                      <label class="rule-item"><input type="checkbox" data-rule><span>El ingreso al gimnasio está permitido únicamente con la mensualidad vigente.</span></label>
                      <label class="rule-item"><input type="checkbox" data-rule><span>Las mensualidades (membresías) no se congelan.</span></label>
                      <label class="rule-item"><input type="checkbox" data-rule><span>Utilice una toalla personal durante el entrenamiento.</span></label>
                      <label class="rule-item"><input type="checkbox" data-rule><span>Dejar las máquinas libre de sudor.</span></label>
                      <label class="rule-item"><input type="checkbox" data-rule><span>Reacomode las pesas, discos, mancuernas y accesorios en su lugar al finalizar.</span></label>
                      <label class="rule-item"><input type="checkbox" data-rule><span>No deje caer las pesas de forma intencional ni haga un uso inadecuado de los equipos.</span></label>
                      <label class="rule-item"><input type="checkbox" data-rule><span>Mantenga una conducta respetuosa con el personal y los demás miembros del gimnasio.</span></label>
                      <label class="rule-item"><input type="checkbox" data-rule><span>Está prohibido fumar, consumir bebidas alcohólicas o sustancias prohibidas dentro de las instalaciones.</span></label>
                      <label class="rule-item"><input type="checkbox" data-rule><span>El gimnasio no se responsabiliza por objetos personales olvidados o extraviados. Se recomienda no traer objetos de valor.</span></label>
                      <label class="rule-item"><input type="checkbox" data-rule><span>El gimnasio no se responsabiliza de accidentes ocurridos. Preguntar al personal sobre el uso correcto de las máquinas.</span></label>
                      <label class="rule-item"><input type="checkbox" data-rule><span>Mantenga el orden y contribuya a conservar nuestras instalaciones en óptimas condiciones.</span></label>
                    </div>
                    <button id="return-button" type="button" disabled>Marca todas las reglas</button>
                  </main>
                  <script>
                    const rulesKey = "mclub-rules-{{TOKEN}}";
                    const checklistKey = `${rulesKey}-checks`;
                    const qrUrl = "{{QR_URL}}";
                    const ruleChecks = Array.from(document.querySelectorAll("[data-rule]"));
                    const returnButton = document.getElementById("return-button");

                    let savedChecks = [];
                    try {
                      savedChecks = JSON.parse(localStorage.getItem(checklistKey) || "[]");
                    } catch {
                      savedChecks = [];
                    }

                    ruleChecks.forEach((check, index) => {
                      check.checked = savedChecks.includes(index);
                    });

                    function syncRules() {
                      const checkedIndexes = ruleChecks
                        .map((check, index) => check.checked ? index : null)
                        .filter((index) => index !== null);
                      const complete = checkedIndexes.length === ruleChecks.length;

                      localStorage.setItem(checklistKey, JSON.stringify(checkedIndexes));
                      if (complete) {
                        localStorage.setItem(rulesKey, "accepted");
                      } else {
                        localStorage.removeItem(rulesKey);
                      }

                      if (returnButton) {
                        returnButton.disabled = !complete;
                        returnButton.textContent = complete ? "Ver mi QR" : "Marca todas las reglas";
                      }
                    }

                    ruleChecks.forEach((check) => {
                      check.addEventListener("change", syncRules);
                    });

                    returnButton?.addEventListener("click", () => {
                      if (!returnButton.disabled) {
                        window.location.href = qrUrl;
                      }
                    });

                    syncRules();
                  </script>
                </body>
                </html>
                """
                .replace("{{TOKEN}}", safeToken)
                .replace("{{QR_URL}}", qrUrl);
    }

    private com.example.gym.entity.User authenticatedUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getUser();
        }
        return null;
    }
}
