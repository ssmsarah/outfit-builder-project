import dns from "dns";
import mongoose from "mongoose";

// Some local network setups (VPN/mesh-networking clients in particular)
// redirect Node's DNS queries to a local stub resolver (observed here as
// 127.0.0.1) that doesn't handle SRV records correctly, causing
// `mongodb+srv://` connections to fail with "querySrv ECONNREFUSED" even
// though the system's own DNS resolution (e.g. Windows' Resolve-DnsName)
// works fine. Replacing Node's DNS servers with public ones fixes it
// without touching any system-wide network/VPN configuration. Verified:
// dns.resolveSrv fails against the default (127.0.0.1) but succeeds
// immediately once these are set.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

export const connectDB = async () => {
  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};