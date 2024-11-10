import { type Config } from "https://esm.sh/tailwindcss/types/config.d.ts?raw";

export const tailwind: Config = {
  content: ["./templates2/**/*.rs"],
  theme: {
    extend: {
      colors: {
        custom1: "#ff0044",
        custom2: "#00ff44",
      },
    },
  },
};
