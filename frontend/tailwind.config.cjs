/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 18px 40px rgba(15, 23, 42, 0.10)",
        ring: "0 0 0 4px rgba(59, 130, 246, 0.18)"
      }
    }
  },
  plugins: []
};

