# Renovacion de membresia manual asistida

## Objetivo

Crear un flujo asistido para renovar membresias desde la lista de clientes, usando un panel lateral tipo `Sheet`, similar al de nueva venta del dashboard.

El usuario operador podra iniciar la renovacion despues de confirmar verbalmente o por mensaje que el cliente desea renovar. El flujo debe permitir renovar con el plan actual o cambiar a un plan nuevo, registrando tambien la informacion de pago.

## Contexto actual

- El frontend ya usa `Sheet` para formularios laterales, por ejemplo en la nueva venta del dashboard.
- El backend ya registra movimientos con tipo `MEMBERSHIP_RENEWAL`.
- El endpoint actual `POST /api/memberships` asigna una membresia nueva, pero rechaza clientes con membresia activa.
- Las renovaciones futuras se guardan como `PENDING` hasta que llegue su fecha de inicio.
- La logica de pagos ya existe en la venta del dashboard:
  - `EFECTIVO`
  - `YAPE`
  - `MIXTO`
- En pagos mixtos se valida que el monto de Yape mas el monto en efectivo sea igual al total.

## Alcance funcional

### Entrada al flujo

Agregar un boton de renovar en cada cliente dentro del modulo de clientes o membresias.

El boton debe:

- Usar un icono claro, por ejemplo `RefreshCw` o `CreditCard`.
- Abrir un `Sheet` lateral.
- Mostrar estado de carga con `Loader2` y `animate-spin` mientras se envia la renovacion.
- Estar disponible para usuarios con permiso de gestion, igual que editar clientes.

### Sheet de renovacion

El panel lateral debe mostrar:

- Nombre completo del cliente.
- Telefono, si existe.
- Membresia actual:
  - nombre del plan;
  - fecha de vencimiento;
  - estado.
- Selector de plan:
  - opcion para mantener el plan actual;
  - opcion para escoger otro plan.
- Fechas:
  - fecha de inicio;
  - fecha de fin;
  - ambas editables si el operador necesita corregirlas.
- Resumen de cobro:
  - plan seleccionado;
  - duracion;
  - monto total.
- Confirmacion manual:
  - checkbox: `Cliente confirmo la renovacion`.
- Metodo de pago:
  - efectivo;
  - Yape;
  - mixto.
- Si el pago es mixto:
  - monto por Yape;
  - monto en efectivo;
  - validacion de suma.

### Comportamiento esperado

1. El operador hace clic en renovar.
2. Se abre el `Sheet` con el cliente precargado.
3. Por defecto se selecciona el plan actual si el cliente tiene membresia activa.
4. El operador confirma que el cliente acepto renovar.
5. El operador conserva el plan actual o selecciona otro.
6. El sistema calcula fechas sugeridas.
7. El operador registra el metodo de pago.
8. El operador envia la renovacion.
9. El backend crea la nueva membresia y registra el movimiento de tipo `MEMBERSHIP_RENEWAL`.
10. El frontend recarga la lista de clientes para mostrar la nueva vigencia.

## Reglas de fechas

### Cliente con membresia activa

Si el cliente tiene una membresia activa, la renovacion debe iniciar por defecto al dia siguiente de la fecha de vencimiento actual.

Ejemplo:

- Membresia actual vence: `2026-09-10`
- Nueva membresia inicia: `2026-09-11`
- Si el plan dura 30 dias, nueva fecha fin sugerida: `2026-10-11`

Esto evita que el cliente pierda dias ya pagados.

### Cliente con membresia vencida o sin activa

Si el cliente no tiene membresia activa, pero ya tuvo membresias antes, la renovacion debe iniciar por defecto hoy.

### Cambio de plan

Si el operador cambia de plan, la fecha fin debe recalcularse usando la duracion del nuevo plan.

## Backend propuesto

### DTO

Crear `RenewMembershipRequest` con:

- `clientId`
- `planId`
- `startDate`
- `endDate`
- `paymentMethod`
- `yapeAmount`
- `cashAmount`

### Endpoint

Agregar:

```http
POST /api/memberships/renew
```

### Servicio

Agregar metodo en `MembershipService`:

```java
public MembershipAssignmentResponse renewMembership(RenewMembershipRequest request, User createdBy)
```

Responsabilidades:

- refrescar membresias vencidas antes de operar;
- validar que el cliente exista;
- validar que el cliente este activo;
- validar que el plan exista;
- buscar la membresia activa mas reciente, si existe;
- calcular fechas sugeridas si no se enviaron;
- crear una nueva `ClientMembership`;
- guardarla como `ACTIVE` si inicia hoy o antes;
- guardarla como `PENDING` si inicia despues de hoy;
- registrar un `Movement` con tipo `MEMBERSHIP_RENEWAL`;
- guardar metodo de pago y montos mixtos;
- devolver `MembershipAssignmentResponse`.

### Consideracion importante

El flujo de renovacion no debe usar la misma restriccion del alta nueva que rechaza clientes con membresia activa. Renovar anticipadamente debe estar permitido.

Para evitar solapes, el backend debe impedir que una renovacion manual inicie antes o durante una vigencia activa o programada existente.

## Frontend propuesto

### API

Agregar en `frontend/src/lib/api.js`:

```js
export async function renewMembership(data, onUnauthorized) {
  return apiFetch(
    "/api/memberships/renew",
    { method: "POST", body: JSON.stringify(data) },
    onUnauthorized
  );
}
```

### Estado en `Clients.jsx`

Agregar estado para controlar:

- cliente seleccionado para renovar;
- formulario de renovacion;
- error del formulario;
- estado de envio;

Ejemplo conceptual:

```js
const [renewalClient, setRenewalClient] = useState(null);
const [renewalForm, setRenewalForm] = useState(EMPTY_RENEWAL_FORM);
const [renewalError, setRenewalError] = useState(null);
const [isRenewing, setIsRenewing] = useState(false);
```

### Boton

Agregar un boton en las acciones del cliente:

```jsx
<Button
  type="button"
  size="icon-sm"
  variant="outline"
  aria-label={`Renovar membresia de ${fullName(client)}`}
  title="Renovar membresia"
  onClick={() => openRenewalSheet(client)}
>
  <RefreshCw className="size-4" />
</Button>
```

### Envio

Al enviar:

- validar que el checkbox de confirmacion este activo;
- validar que haya plan seleccionado;
- validar pago mixto si aplica;
- llamar a `renewMembership`;
- cerrar el `Sheet`;
- recargar clientes y planes con `loadData()`.

## Reutilizacion recomendada

La logica de metodo de pago esta repetida o podria repetirse entre dashboard y renovacion.

Recomendacion:

- Extraer helpers para validar pago mixto.
- Opcionalmente extraer un componente de formulario de pago si se detecta demasiada duplicacion.

Primera implementacion sugerida:

- mantener el cambio enfocado;
- extraer solo helpers pequenos si reduce ruido;
- evitar una refactorizacion grande del dashboard.

## Validaciones

### Frontend

- `npm run build`
- Revisar visualmente:
  - escritorio;
  - movil;
  - plan actual;
  - cambio de plan;
  - pago mixto.

### Backend

- `mvn test` si hay tests disponibles.
- `mvn package` o compilacion equivalente.

### Casos manuales

- Renovar cliente con membresia activa usando el mismo plan.
- Renovar cliente con membresia activa usando un plan distinto.
- Renovar cliente con membresia vencida.
- Intentar renovar cliente inactivo.
- Registrar pago efectivo.
- Registrar pago Yape.
- Registrar pago mixto correcto.
- Intentar pago mixto con suma incorrecta.

## Preguntas abiertas

- Cuando se cambia a un plan nuevo, la renovacion debe empezar siempre despues del vencimiento actual o debe existir una opcion para iniciar hoy.
- Despues de renovar, se debe mostrar/generar el nuevo QR igual que en el dashboard.
- El boton de renovar debe aparecer tambien para clientes sin membresia activa, o solo para clientes que ya tuvieron alguna membresia previa.
