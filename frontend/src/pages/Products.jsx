import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, PackagePlus, Pencil, Trash2 } from "lucide-react";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import PageCard from "@/components/PageCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from "@/lib/api";
import { formatCurrency, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const EMPTY_PRODUCT = {
  name: "",
  price: "",
  stock: "0",
  purchaseAmount: "",
  paymentMethod: "EFECTIVO",
  yapeAmount: "",
  cashAmount: "",
  paidFromCashRegister: true,
  description: "",
};

const PRODUCT_LIST_COLUMNS = "minmax(16rem, 1fr) 8.5rem 6.5rem minmax(18rem, 1fr) auto";
const PAYMENT_METHOD_OPTIONS = ["EFECTIVO", "YAPE", "MIXTO"];

function Products({ searchQuery = "" }) {
  const { logout, user } = useAuth();
  const isMobile = useIsMobile();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [productView, setProductView] = useState("grid");
  const canManageCatalog = user?.role === "SUDO" || user?.role === "ADMIN";

  const handleUnauthorized = useCallback(() => {
    logout();
  }, [logout]);

  const loadData = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const productsData = await listProducts(handleUnauthorized);
      setProducts(productsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar productos");
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (isMobile) {
      setProductView("list");
    }
  }, [isMobile]);

  const resetForm = () => {
    setProductForm(EMPTY_PRODUCT);
    setEditingProduct(null);
    setShowForm(false);
    setFormError(null);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      purchaseAmount: "",
      paymentMethod: "EFECTIVO",
      yapeAmount: "",
      cashAmount: "",
      paidFromCashRegister: true,
      description: product.description ?? "",
    });
    setShowForm(true);
    setFormError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const stockEntryQuantity = Math.max(
      0,
      Number(productForm.stock || 0) - (editingProduct ? Number(editingProduct.stock || 0) : 0)
    );
    const hasPurchaseExpense = stockEntryQuantity > 0 && productForm.purchaseAmount !== "";

    const payload = {
      name: productForm.name.trim(),
      price: Number(productForm.price),
      stock: Number(productForm.stock),
      purchaseAmount: hasPurchaseExpense ? Number(productForm.purchaseAmount) : null,
      paymentMethod: hasPurchaseExpense ? productForm.paymentMethod : null,
      yapeAmount:
        hasPurchaseExpense && productForm.paymentMethod === "MIXTO"
          ? Number(productForm.yapeAmount || 0)
          : null,
      cashAmount:
        hasPurchaseExpense && productForm.paymentMethod === "MIXTO"
          ? Number(productForm.cashAmount || 0)
          : null,
      paidFromCashRegister: hasPurchaseExpense ? productForm.paidFromCashRegister : false,
      description: productForm.description.trim() || null,
    };

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload, handleUnauthorized);
      } else {
        await createProduct(payload, handleUnauthorized);
      }
      resetForm();
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al guardar producto");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (product, confirmationPassword) => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteProduct(product.id, confirmationPassword, handleUnauthorized);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Error al eliminar producto");
    } finally {
      setIsDeleting(false);
    }
  };

  const productViewButtonClass = (value) =>
    cn(
      "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
      productView === value
        ? "bg-background text-foreground shadow-xs"
        : "text-muted-foreground hover:text-foreground"
    );

  const renderProductStatus = (product) => (
    <Badge
      className={cn(
        "w-fit shrink-0",
        product.stock > 0
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      )}
    >
      {product.stock > 0 ? "Disponible" : "Agotado"}
    </Badge>
  );

  const stockEntryQuantity = Math.max(
    0,
    Number(productForm.stock || 0) - (editingProduct ? Number(editingProduct.stock || 0) : 0)
  );

  const renderProductListMobileCard = (product) => (
    <div key={product.id} className="border-b px-3 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold leading-snug">{product.name}</h3>
          <p
            className={cn(
              "mt-1 text-sm text-muted-foreground",
              product.stock <= 0 && "text-destructive"
            )}
          >
            {formatCurrency(product.price)} · Stock {product.stock}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {product.description || "Sin descripción"}
          </p>
        </div>
        {canManageCatalog && (
          <div className="flex shrink-0 gap-1.5">
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label={`Editar ${product.name}`}
              title="Editar producto"
              onClick={() => openEdit(product)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
              aria-label={`Eliminar ${product.name}`}
              title="Eliminar producto"
              onClick={() => setDeleteTarget(product)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase("es");

    if (!normalizedSearch) {
      return products;
    }

    return products.filter((product) =>
      [
        product.name,
        product.description,
        product.price,
        product.stock,
      ]
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLocaleLowerCase("es").includes(normalizedSearch))
    );
  }, [products, searchQuery]);

  return (
    <div className="flex flex-col gap-4">
      <PageCard>
        {error && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DeleteConfirmationDialog
          open={Boolean(deleteTarget)}
          title="Eliminar producto"
          description={`Confirma tu contraseña para eliminar "${deleteTarget?.name}".`}
          error={deleteError}
          isSubmitting={isDeleting}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
          onConfirm={(password) => handleDelete(deleteTarget, password)}
        />

        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="grid w-full grid-cols-2 rounded-lg border bg-muted/50 p-1 sm:w-auto"
              role="group"
              aria-label="Vista de productos"
            >
              <button
                type="button"
                className={cn("order-2 sm:order-1", productViewButtonClass("grid"))}
                aria-pressed={productView === "grid"}
                onClick={() => setProductView("grid")}
              >
                <LayoutGrid />
                Grid
              </button>
              <button
                type="button"
                className={cn("order-1 sm:order-2", productViewButtonClass("list"))}
                aria-pressed={productView === "list"}
                onClick={() => setProductView("list")}
              >
                <List />
                Lista
              </button>
            </div>
            {canManageCatalog && (
            <Button
              className="hidden sm:inline-flex"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              <PackagePlus />
              Nuevo producto
            </Button>
            )}
          </div>

          {canManageCatalog && (
          <Sheet
            open={showForm}
            onOpenChange={(open) => {
              if (!open) {
                resetForm();
              } else {
                setShowForm(true);
              }
            }}
          >
            <SheetContent className="w-full overflow-y-auto sm:max-w-md">
              <SheetHeader className="border-b pr-12">
                <SheetTitle>
                  {editingProduct ? "Editar producto" : "Nuevo producto"}
                </SheetTitle>
                <SheetDescription>
                  {editingProduct
                    ? "Actualiza precio, stock y descripción del producto."
                    : "Agrega un producto para venderlo desde el dashboard."}
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={handleSubmit} className="grid gap-4 px-4 pb-4">
                <div className="space-y-2">
                  <Label htmlFor="productName">Nombre</Label>
                  <Input
                    id="productName"
                    value={productForm.name}
                    onChange={(event) =>
                      setProductForm({ ...productForm, name: event.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productPrice">Precio (S/)</Label>
                  <Input
                    id="productPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={productForm.price}
                    onChange={(event) =>
                      setProductForm({ ...productForm, price: event.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productStock">Stock</Label>
                  <Input
                    id="productStock"
                    type="number"
                    min="0"
                    value={productForm.stock}
                    onChange={(event) =>
                      setProductForm({ ...productForm, stock: event.target.value })
                    }
                    required
                  />
                </div>
                {stockEntryQuantity > 0 && (
                  <div className="grid gap-4 rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="productPurchaseAmount">Egreso de la entrada</Label>
                      <Badge variant="secondary">+{stockEntryQuantity} unidades</Badge>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="productPurchaseAmount">Costo total</Label>
                      <Input
                        id="productPurchaseAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={productForm.purchaseAmount}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            purchaseAmount: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="productPaymentMethod">Medio de pago</Label>
                      <select
                        id="productPaymentMethod"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                        value={productForm.paymentMethod}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            paymentMethod: event.target.value,
                            yapeAmount: "",
                            cashAmount: "",
                          })
                        }
                      >
                        {PAYMENT_METHOD_OPTIONS.map((method) => (
                          <option key={method} value={method}>
                            {PAYMENT_METHOD_LABELS[method]}
                          </option>
                        ))}
                      </select>
                    </div>
                    {productForm.paymentMethod === "MIXTO" && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="productPurchaseYapeAmount">Yape</Label>
                          <Input
                            id="productPurchaseYapeAmount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={productForm.yapeAmount}
                            onChange={(event) =>
                              setProductForm({
                                ...productForm,
                                yapeAmount: event.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="productPurchaseCashAmount">Efectivo</Label>
                          <Input
                            id="productPurchaseCashAmount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={productForm.cashAmount}
                            onChange={(event) =>
                              setProductForm({
                                ...productForm,
                                cashAmount: event.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                    <label className="flex items-start gap-3 rounded-lg border bg-card px-3 py-3 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={productForm.paidFromCashRegister}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            paidFromCashRegister: event.target.checked,
                          })
                        }
                      />
                      <span>
                        <span className="block font-medium">Sale de caja</span>
                        <span className="block text-xs text-muted-foreground">
                          Descuenta esta compra del cierre esperado del día.
                        </span>
                      </span>
                    </label>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="productDescription">Descripción</Label>
                  <Input
                    id="productDescription"
                    value={productForm.description}
                    onChange={(event) =>
                      setProductForm({ ...productForm, description: event.target.value })
                    }
                  />
                </div>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={resetForm}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </form>
            </SheetContent>
          </Sheet>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredProducts.length && productView === "grid" ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-3 lg:grid-cols-2">
              {filteredProducts.map((product) => (
                <div key={product.id} className="rounded-lg border p-3 sm:rounded-xl sm:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold leading-snug">{product.name}</h3>
                      <p className="text-xs text-muted-foreground sm:text-sm">
                        {formatCurrency(product.price)} · Stock: {product.stock}
                      </p>
                    </div>
                    {renderProductStatus(product)}
                  </div>
                  <div className="mt-3 flex flex-col gap-3 sm:mt-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                        {product.description || "Sin descripción"}
                      </p>
                    </div>
                    {canManageCatalog && (
                    <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:justify-end sm:gap-2">
                      <Button
                        size="icon-sm"
                        variant="outline"
                        className="w-full sm:hidden"
                        aria-label={`Editar ${product.name}`}
                        title="Editar producto"
                        onClick={() => openEdit(product)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 sm:hidden"
                        aria-label={`Eliminar ${product.name}`}
                        title="Eliminar producto"
                        onClick={() => setDeleteTarget(product)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="hidden sm:inline-flex sm:flex-none"
                        onClick={() => openEdit(product)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="hidden border-destructive/30 text-destructive hover:bg-destructive/10 sm:inline-flex sm:flex-none"
                        onClick={() => setDeleteTarget(product)}
                      >
                        Eliminar
                      </Button>
                    </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length ? (
            <>
              <div className="overflow-hidden rounded-xl border md:hidden">
                {filteredProducts.map((product) => renderProductListMobileCard(product))}
              </div>
              <div className="hidden overflow-x-auto rounded-xl border md:block">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="grid min-w-[920px] items-center gap-4 border-b px-4 py-3 last:border-b-0"
                    style={{ gridTemplateColumns: PRODUCT_LIST_COLUMNS }}
                  >
                    <h3 className="min-w-0 font-semibold truncate">{product.name}</h3>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatCurrency(product.price)}
                    </span>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      Stock: {product.stock}
                    </span>
                    <span className="min-w-0 text-sm text-muted-foreground truncate">
                      {product.description || "Sin descripción"}
                    </span>
                    {canManageCatalog && (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => openEdit(product)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(product)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {searchQuery.trim()
                ? "No hay productos que coincidan con la búsqueda."
                : "No hay productos registrados."}
            </p>
          )}
        </div>
      </PageCard>

      {canManageCatalog && (
        <Button
          type="button"
          aria-label="Nuevo producto"
          title="Nuevo producto"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-40 h-14 rounded-full px-4 shadow-lg sm:hidden"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <PackagePlus className="size-5" />
        </Button>
      )}
    </div>
  );
}

export default Products;
