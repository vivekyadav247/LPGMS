/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14213d",
        sand: "#fff8ef",
        accent: "#14835c",
        amber: "#f59e0b",
        danger: "#dc2626",
        soft: "#f6f3ee",
        shell: "#f7f2e8",
      },
      boxShadow: {
        card: "0 20px 40px -28px rgba(20, 33, 61, 0.28)",
        soft: "0 24px 48px -30px rgba(20, 33, 61, 0.22)",
        panel: "0 14px 28px -18px rgba(20, 33, 61, 0.18)",
        lift: "0 28px 70px -40px rgba(20, 33, 61, 0.3)",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      backgroundImage: {
        shell:
          "radial-gradient(circle at top left, rgba(20, 131, 92, 0.14), transparent 22%), radial-gradient(circle at 88% 10%, rgba(245, 158, 11, 0.18), transparent 18%), linear-gradient(180deg, rgba(255, 248, 239, 0.92), rgba(255, 255, 255, 0.98))",
        ambient:
          "radial-gradient(circle at top left, rgba(20, 131, 92, 0.12), transparent 24%), radial-gradient(circle at 85% 10%, rgba(245, 158, 11, 0.12), transparent 20%), linear-gradient(180deg, rgba(255, 248, 239, 0.92), rgba(255, 255, 255, 0.98))",
      },
    },
  },
  plugins: [],
};
