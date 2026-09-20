import NewArrivals from "../components/NewArrivals";
import "../../stores/pages/Stores.css";

const NewArrivalsPage = () => {
  return (
    <div className="stores-page">

      <div className="stores-header">
        <h1>New Arrivals</h1>
        <p>The latest products added to Shoppea.</p>
      </div>

      <NewArrivals />

    </div>
  );
};

export default NewArrivalsPage;
