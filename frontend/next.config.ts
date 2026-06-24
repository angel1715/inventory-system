import withPWA from "next-pwa";

const nextConfig = {
  images: {
    domains: ["res.cloudinary.com"],
  },
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
})(nextConfig);