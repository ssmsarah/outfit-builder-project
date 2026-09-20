import { Truck, RotateCcw, ShieldCheck, Headphones } from "lucide-react";
import "./TrustBadges.css";

const badges = [
  {
    icon: Truck,
    title: "Free Shipping",
    subtitle: "On orders over Rs. 5,000",
  },
  {
    icon: RotateCcw,
    title: "Easy Returns",
    subtitle: "Within 7 days",
  },
  {
    icon: ShieldCheck,
    title: "Secure Payments",
    subtitle: "100% protected",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    subtitle: "We're here to help",
  },
];

const TrustBadges = () => {
  return (
    <section className="trust-badges">
      {badges.map(({ icon: Icon, title, subtitle }) => (
        <div className="trust-badge" key={title}>
          <div className="trust-badge-icon">
            <Icon size={22} strokeWidth={1.8} />
          </div>

          <div>
            <strong>{title}</strong>
            <span>{subtitle}</span>
          </div>
        </div>
      ))}
    </section>
  );
};

export default TrustBadges;
