/**
 * Video de fundo do site inteiro: mudo, loop infinito, atras de todo o
 * conteudo (z-index -2), com um veu na cor do tema (z-index -1) por cima
 * para manter a leitura. O arquivo NAO e versionado — vive direto no
 * public_html (/media/bg-loop.mp4), publicado por scp igual ao .htaccess;
 * se o arquivo faltar, o <video> nao pinta nada e o fundo solido do tema
 * (base no html) segue identico ao visual anterior.
 */
import { useEffect, useRef } from "react";

export function BackgroundVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.play().catch(() => {});
    // iOS em economia de bateria (e afins) bloqueia autoplay ate haver
    // gesto: re-tenta UMA vez no primeiro toque e sai de cena.
    const retry = () => { v.play().catch(() => {}); };
    window.addEventListener("pointerdown", retry, { once: true, passive: true });
    return () => window.removeEventListener("pointerdown", retry);
  }, []);

  return (
    <>
      <video
        ref={ref}
        className="bg-video"
        src="/media/bg-loop-1080.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        disablePictureInPicture
      />
      <div className="bg-video-veil" aria-hidden="true" />
    </>
  );
}
