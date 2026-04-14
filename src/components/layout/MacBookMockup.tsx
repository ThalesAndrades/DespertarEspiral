import macbookMockupNew from "@/assets/macbook-mockup-new.png";

export default function MacBookMockup() {
  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
        maxWidth: "800px",
        margin: "0 auto",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <img
        src={macbookMockupNew}
        alt="Plataforma Mulher Espiral no MacBook"
        loading="lazy"
        decoding="async"
        style={{
          width: "100%",
          height: "auto",
          objectFit: "contain",
          display: "block",
          filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.15))",
        }}
      />
    </div>
  );
}