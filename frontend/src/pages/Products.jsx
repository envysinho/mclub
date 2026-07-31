import { useCallback, useEffect, useState } from "react";
import { LayoutGrid, List, PackagePlus } from "lucide-react";
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
import { formatCurrency } from "@/lib/constants";
import { cn } from "@/lib/utils";

const EMPTY_PRODUCT = {
  name: "",
  price: "",
  stock: "0",
  description: "",
};

const PRODUCT_LIST_COLUMNS = "minmax(16rem, 1fr) 8.5rem 6.5rem minmax(18rem, 1fr) auto";

function Products() {
  const { logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [productView, setProductView] = useState("grid");

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
      description: product.description ?? "",
    });
    setShowForm(true);
    setFormError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const payload = {
      name: productForm.name.trim(),
      price: Number(productForm.price),
      stock: Number(productForm.stock),
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

  const handleDelete = async (product) => {
    if (!window.confirm(`¿Eliminar "${product.name}"?`)) return;
    try {
      await deleteProduct(product.id, handleUnauthorized);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar producto");
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

  return (
    <div className="flex flex-col gap-4">
      <PageCard
        title="Productos"
        description="Administra el catálogo de productos del gimnasio."
      >
        {error && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="grid w-full grid-cols-2 rounded-lg border bg-muted/50 p-1 sm:w-auto"
              role="group"
              aria-label="Vista de productos"
            >
              <button
                type="button"
                className={productViewButtonClass("grid")}
                aria-pressed={productView === "grid"}
                onClick={() => setProductView("grid")}
              >
                <LayoutGrid />
                Grid
              </button>
              <button
                type="button"
                className={productViewButtonClass("list")}
                aria-pressed={productView === "list"}
                onClick={() => setProductView("list")}
              >
                <List />
                Lista
              </button>
            </div>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              <PackagePlus />
              Nuevo producto
            </Button>
          </div>

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

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : products.length && productView === "grid" ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {products.map((product) => (
                <div key={product.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(product.price)} · Stock: {product.stock}
                      </p>
                    </div>
                    {renderProductStatus(product)}
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground break-words">
                        {product.description || "Sin descripción"}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none"
                        onClick={() => openEdit(product)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 sm:flex-none"
                        onClick={() => handleDelete(product)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length ? (
            <div className="overflow-x-auto rounded-xl border">
              {products.map((product) => (
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
                      onClick={() => handleDelete(product)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay productos registrados.</p>
          )}
        </div>
      </PageCard>
    </div>
  );
}

export default Products;
