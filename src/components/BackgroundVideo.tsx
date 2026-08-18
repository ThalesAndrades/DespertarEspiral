/**
 * Video de fundo do site inteiro: mudo, loop infinito, atras de todo o
 * conteudo (z-index -2), com um veu na cor do tema (z-index -1) por cima
 * para manter a leitura. Os arquivos NAO sao versionados — vivem direto no
 * public_html/media, publicados por scp igual ao .htaccess. ⚠️ O CDN da
 * Hostinger CACHEIA mp4 e ignora overwrite: trocar o video exige NOME NOVO
 * + rebuild. Se o arquivo faltar, o <video> nao pinta nada e o fundo solido
 * do tema (base no html) segue identico ao visual anterior.
 * Desktop: 1080p CRF17 (nitidez maxima) · mobile: 720p (menos dados).
 */
import { useEffect, useRef } from "react";

const SRC_DESKTOP = "/media/bg-loop-1080-v2.mp4";
const SRC_MOBILE  = "/media/bg-loop-720.mp4";

export function BackgroundVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;

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
        src={isMobile ? SRC_MOBILE : SRC_DESKTOP}
        poster="/media/bg-poster.jpg"
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
