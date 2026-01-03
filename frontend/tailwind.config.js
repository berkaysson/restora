/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  // DaisyUI'ı burada require ile çağırın
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["nord", "sunset"], // Temalar buraya ekli
    darkTheme: "sunset",
  },
};
