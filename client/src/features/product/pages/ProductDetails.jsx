import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const ProductDetails = () => {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/products/${id}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to fetch product"
          );
        }

        setProduct(data);
      } catch (error) {
        console.error("Product details error:", error);
        setError(error.message);
      }
    };

    fetchProduct();
  }, [id]);

  if (error) {
    return <p>{error}</p>;
  }

  if (!product) {
    return <p>Loading product...</p>;
  }

  return (
    <div>
      <h1>{product.name}</h1>

      <img
        src={product.image}
        alt={product.name}
        width="400"
      />

      <p>{product.description}</p>

      <p>Rs. {product.price}</p>

     <p>
  Category: {product.category}
</p>

<p>
  Stock: {product.stock}
</p>

<p>
  Shop: {product.store}
</p>
    </div>
  );
};

export default ProductDetails;