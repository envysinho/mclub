import { useCallback, useEffect, useState } from "react";
import { PackagePlus, ShoppingCart } from "lucide-react";
import PageCard from "@/components/PageCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  createProduct,
  deleteProduct,
  listClients,
  listProducts,
  sellProduct,
  updateProduct,
} from "@/lib/api";
import { formatCurrency, fullName } from "@/lib/constants";

const EMPTY_PRODUCT = {
  name: "",
  price: "",
  stock: "0",
  description: "",
};

function Products() {
  const { logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);

  const [saleProductId, setSaleProductId] = useState("");
  const [saleQuantity, setSaleQuantity] = useState("1");
  const [saleClientId, setSaleClientId] = useState("");

  const handleUnauthorized = useCallback(() => {
    logout();
  }, [logout]);

  const loadData = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const [productsData, clientsData] = await Promise.all([
        listProducts(handleUnauthorized),
        listClients(handleUnauthorized),
      ]);
      setProducts(productsData);
      setClients(clientsData);
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

  const handleSell = async (event) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await sellProduct(
        {
          productId: Number(saleProductId),
          quantity: Number(saleQuantity),
          clientId: saleClientId ? Number(saleClientId) : null,
        },
        handleUnauthorized
      );
      setSaleProductId("");
      setSaleQuantity("1");
      setSaleClientId("");
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al registrar venta");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageCard title="Registrar venta">
        <form onSubmit={handleSell} className="mx-auto grid max-w-xl gap-4">
          <div className="space-y-2">
            <Label htmlFor="saleProduct">Producto</Label>
            <select
              id="saleProduct"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
              value={saleProductId}
              onChange={(e) => setSaleProductId(e.target.value)}
              required
            >
              <option value="">Seleccionar producto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · Stock {product.stock}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="saleQuantity">Cantidad</Label>
            <Input
              id="saleQuantity"
              type="number"
              min="1"
              value={saleQuantity}
              onChange={(e) => setSaleQuantity(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="saleClient">Cliente (opcional)</Label>
            <select
              id="saleClient"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
              value={saleClientId}
              onChange={(e) => setSaleClientId(e.target.value)}
            >
              <option value="">Venta general</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {fullName(client)}
                </option>
              ))}
            </select>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" disabled={isSubmitting || !products.length}>
            <ShoppingCart />
            {isSubmitting ? "Registrando..." : "Registrar venta"}
          </Button>
        </form>
      </PageCard>

      <PageCard
        title="Productos"
        description="Catálogo de productos del gimnasio y registro de ventas."
        action={
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <PackagePlus />
            Nuevo producto
          </Button>
        }
      >
        {error && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 grid gap-4 rounded-xl border p-4 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <h3 className="font-medium">
                {editingProduct ? "Editar producto" : "Nuevo producto"}
              </h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="productName">Nombre</Label>
              <Input
                id="productName"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
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
                onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
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
                onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="productDescription">Descripción</Label>
              <Input
                id="productDescription"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              />
            </div>
            {formError && <p className="md:col-span-2 text-sm text-destructive">{formError}</p>}
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : products.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {products.map((product) => (
              <div key={product.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(product.price)} · Stock: {product.stock}
                    </p>
                    {product.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{product.description}</p>
                    )}
                  </div>
                  <Badge variant={product.stock > 0 ? "secondary" : "destructive"}>
                    {product.stock > 0 ? "Disponible" : "Agotado"}
                  </Badge>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(product)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(product)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No hay productos registrados.</p>
        )}
      </PageCard>
    </div>
  );
}

export default Products;
