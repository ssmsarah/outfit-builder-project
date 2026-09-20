import { useState } from "react";
import { PlusCircle } from "lucide-react";
import api from "../../../api/axios";
import "../pages/SellerDashboard.css";

const emptyForm = {
  name: "",
  category: "",
  description: "",
  price: "",
  stock: "",
  image: "",
  size: "",
  color: "",
  status: "Active",
  discountType: "none",
  discountValue: "",
};

const toFormState = (product) => ({
  name: product.name || "",
  category: product.category
    ? product.category.charAt(0).toUpperCase() + product.category.slice(1)
    : "",
  description: product.description || "",
  price: product.price ?? "",
  stock: product.stock ?? "",
  image: product.image || "",
  size: product.sizes ? product.sizes.join(", ") : "",
  color: product.colors ? product.colors.join(", ") : "",
  status: product.available ? "Active" : "Inactive",
  discountType: product.discountType || "none",
  discountValue: product.discountValue || "",
});

// mode: "add" | "edit". For "edit", pass productId + initialProduct.
const ProductForm = ({ mode, productId, initialProduct, onSuccess, onCancel }) => {
  const [form, setForm] = useState(
    initialProduct ? toFormState(initialProduct) : emptyForm
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    // Instant local preview while the upload is in progress
    setForm((prev) => ({
      ...prev,
      image: URL.createObjectURL(file),
    }));

    try {
      setUploadingImage(true);
      setError("");

      const formData = new FormData();
      formData.append("image", file);

      const { data } = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setForm((prev) => ({ ...prev, image: data.imageUrl }));
    } catch (err) {
      console.error("Image upload error:", err);
      setError(err.response?.data?.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (uploadingImage) {
      setError("Please wait for the image to finish uploading.");
      return;
    }

    if (form.image?.startsWith("blob:")) {
      setError("Image upload failed. Please choose the image again.");
      return;
    }

    if (!form.image) {
      setError("Please upload a product image.");
      return;
    }

    const payload = {
      name: form.name,
      category: form.category.toLowerCase(),
      description: form.description,
      price: Number(form.price),
      stock: Number(form.stock),
      image: form.image,
      sizes: form.size ? form.size.split(",").map((s) => s.trim()) : [],
      colors: form.color ? form.color.split(",").map((c) => c.trim()) : [],
      available: form.status === "Active",
      discountType: form.discountType,
      discountValue: form.discountValue ? Number(form.discountValue) : 0,
    };

    try {
      setSubmitting(true);

      if (mode === "edit") {
        const { data } = await api.put(`/products/${productId}`, payload);
        onSuccess(data.product);
      } else {
        const { data } = await api.post("/products", payload);
        onSuccess(data);
      }
    } catch (err) {
      console.error(`${mode} product error:`, err);
      setError(
        err.response?.data?.message ||
          `Failed to ${mode === "edit" ? "update" : "add"} product`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="product-form-card">

      <form onSubmit={handleSubmit}>

        {/* PRODUCT NAME */}

        <div className="product-form-group">
          <label>Product Name</label>
          <input
            type="text"
            name="name"
            placeholder="Enter product name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>

        {/* CATEGORY */}

        <div className="product-form-group">
          <label>Category</label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            required
          >
            <option value="">Select category</option>
            <option value="Dresses">Dresses</option>
            <option value="Tops">Tops</option>
            <option value="Bottoms">Bottoms</option>
            <option value="Formals">Formals</option>
            <option value="Shoes">Shoes</option>
            <option value="Accessories">Accessories</option>
          </select>
        </div>

        {/* DESCRIPTION */}

        <div className="product-form-group">
          <label>Description</label>
          <textarea
            name="description"
            placeholder="Enter product description"
            value={form.description}
            onChange={handleChange}
            rows="4"
            required
          />
        </div>

        {/* PRICE + STOCK */}

        <div className="product-form-row">
          <div className="product-form-group">
            <label>Price (Rs.)</label>
            <input
              type="number"
              name="price"
              placeholder="Enter price"
              min="0"
              value={form.price}
              onChange={handleChange}
              required
            />
          </div>

          <div className="product-form-group">
            <label>Stock Quantity</label>
            <input
              type="number"
              name="stock"
              placeholder="Enter stock quantity"
              min="0"
              value={form.stock}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* PRODUCT IMAGE */}

        <div className="product-form-group">
          <label>Product Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            required={mode === "add"}
          />

          {uploadingImage && (
            <p className="image-upload-status">Uploading image...</p>
          )}

          {form.image && (
            <div className="image-preview">
              <img src={form.image} alt="Product preview" />
            </div>
          )}
        </div>

        {/* SIZE + COLOR */}

        <div className="product-form-row">
          <div className="product-form-group">
            <label>Size</label>
            <input
              type="text"
              name="size"
              placeholder="e.g. S, M, L, XL"
              value={form.size}
              onChange={handleChange}
            />
          </div>

          <div className="product-form-group">
            <label>Color</label>
            <input
              type="text"
              name="color"
              placeholder="e.g. Black, White"
              value={form.color}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* DISCOUNT */}

        <div className="product-form-row">
          <div className="product-form-group">
            <label>Discount Type</label>
            <select
              name="discountType"
              value={form.discountType}
              onChange={handleChange}
            >
              <option value="none">No Discount</option>
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat Amount (Rs.)</option>
            </select>
          </div>

          <div className="product-form-group">
            <label>
              Discount Value
              {form.discountType === "percentage" && " (%)"}
              {form.discountType === "flat" && " (Rs.)"}
            </label>
            <input
              type="number"
              name="discountValue"
              placeholder={form.discountType === "none" ? "N/A" : "Enter discount value"}
              min="0"
              max={form.discountType === "percentage" ? 100 : undefined}
              value={form.discountValue}
              onChange={handleChange}
              disabled={form.discountType === "none"}
            />
          </div>
        </div>

        {/* PRODUCT STATUS */}

        <div className="product-form-group">
          <label>Product Status</label>
          <select name="status" value={form.status} onChange={handleChange}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {error && <p className="checkout-error">{error}</p>}

        {/* FORM BUTTONS */}

        <div className="product-form-actions">
          <button
            type="button"
            className="cancel-product-button"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="save-product-button"
            disabled={uploadingImage || submitting}
          >
            <PlusCircle size={18} />
            {uploadingImage
              ? "Uploading Image..."
              : submitting
              ? mode === "edit"
                ? "Updating..."
                : "Adding..."
              : mode === "edit"
              ? "Update Product"
              : "Add Product"}
          </button>
        </div>

      </form>

    </div>
  );
};

export default ProductForm;
