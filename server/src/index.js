import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { seedDemoProducts } from "./services/productService.js";

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from .env");
  }

  await connectDB(process.env.MONGODB_URI);

  console.log("MongoDB connected successfully");

  await seedDemoProducts();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});