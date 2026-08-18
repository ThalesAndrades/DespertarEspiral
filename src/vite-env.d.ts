/// <reference types="vite/client" />

// vite-imagetools v10 ships no client type declarations. We resolve images
// at build time with a `...&format=webp` query; declare that the default
// export of any such import is the emitted asset URL.
declare module "*format=webp" {
  const src: string;
  export default src;
}
