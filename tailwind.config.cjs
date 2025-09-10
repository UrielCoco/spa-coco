/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // 🔑 Mapeo de tokens CSS → colores Tailwind (necesario para bg-background, text-foreground, etc.)
      colors: {
        border: "hsl(var(--border))",         // << clave para border-border
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        gold: { 50:"#FFF9E6",100:"#FDEFC2",200:"#F6E190",300:"#E9C95B",400:"#DDB841",500:"#D4AF37",600:"#C6A233",700:"#A8832B",800:"#7D6120",900:"#5C4618" },
      },

      // radios shadcn + nuestro 2xl
      borderRadius: { lg:"var(--radius)", md:"calc(var(--radius)-2px)", sm:"calc(var(--radius)-4px)", "2xl":"1rem" },
      boxShadow: { soft:"0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.10)", gold:"0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(212,175,55,.25)" },
    

      // anims shadcn (por si las usa tu UI)
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
