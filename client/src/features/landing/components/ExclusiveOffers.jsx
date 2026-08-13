import "./ExclusiveOffers.css";
import dress from "../../../assets/dress.jpg";
import skirt from "../../../assets/skirt.jpg";
import hoodie from "../../../assets/hoodie.jpg";
import tshirt from "../../../assets/tshirt.jpg";

const products = [
  {
    id: 1,
    image: dress,
    name: "Pastel Yellow Dress",
    price: "Rs. 2,499",
    
  },
  {
    id: 2,
    image: skirt,
    name: "Polka Dots Skirt",
    price: "Rs. 1,999",
    
  },
  {
    id: 3,
    image: hoodie,
    name: "Hoodie",
    price: "Rs. 3,299",
  },
  {
    id: 4,
    image: tshirt,
    name: "Shirt",
    price: "Rs. 2,199",
  },
];

const ExclusiveOffers = () => {
  return (
    <section className="exclusive-offers">
      <div className="section-title">
        <h2>Exclusive Offers</h2>
       
      </div>

      <div className="product-grid">
        {products.map((product) => (
          <div className="product-card" key={product.id}>

           <div className="product-image">
  <img src={product.image} alt={product.name} />
</div>

            <h3>{product.name}</h3>

            <p className="price">{product.price}</p>

            <button>View Product</button>

          </div>
        ))}
      </div>
    </section>
  );
};

export default ExclusiveOffers;