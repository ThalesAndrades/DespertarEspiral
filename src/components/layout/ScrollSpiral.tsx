/**
 * BackgroundSpiral — CSS-only, zero JS overhead.
 * Two concentric spirals:
 *   • Outer: slow clockwise rotation (120s)
 *   • Inner: slow counter-clockwise + subtle scale breath (90s / 8s)
 * Only `transform` and `opacity` are animated → pure GPU compositing, no layout/paint.
 */
export default function BackgroundSpiral() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      {/* ── Radial gold glow (static, no animation) ── */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(900px, 140vw)",
          height: "min(900px, 140vh)",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse 60% 55% at 50% 50%, var(--spiral-glow) 0%, transparent 68%)",
          willChange: "auto",
        }}
      />

      {/* ── Outer spiral — rotates clockwise, 120s ── */}
      <div
        className="spiral-rotate-cw"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          marginLeft: "min(-340px, -38vw)",
          marginTop:  "min(-340px, -38vh)",
          width:  "min(680px, 76vw)",
          height: "min(680px, 76vh)",
          willChange: "transform",
        }}
      >
        <svg
          viewBox="0 0 600 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <filter id="sg-blur-outer" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          {/* Glow copy */}
          <path
            d="M300 540C138 540 58 418 58 300C58 168 160 68 288 68C395 68 478 152 478 260C478 352 410 418 322 418C248 418 188 360 188 288C188 222 240 172 305 172C363 172 408 218 408 276C408 328 370 362 320 362C278 362 246 330 246 290C246 254 274 228 309 228C341 228 364 252 364 283C364 311 343 332 316 332"
            stroke="rgba(198,168,112,0.12)"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
            filter="url(#sg-blur-outer)"
          />
          {/* Main stroke */}
          <path
            d="M300 540C138 540 58 418 58 300C58 168 160 68 288 68C395 68 478 152 478 260C478 352 410 418 322 418C248 418 188 360 188 288C188 222 240 172 305 172C363 172 408 218 408 276C408 328 370 362 320 362C278 362 246 330 246 290C246 254 274 228 309 228C341 228 364 252 364 283C364 311 343 332 316 332"
            stroke="var(--spiral-stroke)"
            strokeWidth="1.3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      {/* ── Inner spiral — counter-clockwise + breathing ── */}
      <div
        className="spiral-rotate-ccw spiral-breathe"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          marginLeft: "min(-200px, -22vw)",
          marginTop:  "min(-200px, -22vh)",
          width:  "min(400px, 44vw)",
          height: "min(400px, 44vh)",
          willChange: "transform",
        }}
      >
        <svg
          viewBox="0 0 600 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <filter id="sg-blur-inner" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          {/* Glow copy */}
          <path
            d="M300 440C200 440 142 368 142 300C142 224 202 168 272 168C336 168 384 216 384 278C384 334 342 372 292 372C248 372 216 340 216 298C216 260 244 234 280 234C313 234 336 258 336 290C336 318 316 336 294 336"
            stroke="rgba(198,168,112,0.1)"
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
            filter="url(#sg-blur-inner)"
          />
          {/* Main stroke */}
          <path
            d="M300 440C200 440 142 368 142 300C142 224 202 168 272 168C336 168 384 216 384 278C384 334 342 372 292 372C248 372 216 340 216 298C216 260 244 234 280 234C313 234 336 258 336 290C336 318 316 336 294 336"
            stroke="var(--spiral-stroke)"
            strokeWidth="0.9"
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
          />
          {/* Centre diamond */}
          <path
            d="M300 292 L306 300 L300 308 L294 300 Z"
            fill="var(--gold)"
            opacity="0.45"
          />
          <circle cx="300" cy="300" r="1.8" fill="var(--gold)" opacity="0.6" />
        </svg>
      </div>

      {/* ── Far-outer large ring — very slow, opposite direction ── */}
      <div
        className="spiral-rotate-cw-slow"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          marginLeft: "min(-480px, -52vw)",
          marginTop:  "min(-480px, -52vh)",
          width:  "min(960px, 104vw)",
          height: "min(960px, 104vh)",
          willChange: "transform",
          opacity: 0.4,
        }}
      >
        <svg
          viewBox="0 0 600 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%" }}
        >
          <path
            d="M300 570C114 570 34 432 34 300C34 154 148 50 292 50C418 50 508 142 508 268C508 376 424 454 320 454C224 454 152 384 152 290C152 206 214 148 296 148C372 148 428 202 428 278C428 346 378 394 316 394C262 394 222 354 222 302C222 256 258 220 304 220C346 220 374 250 374 290C374 326 348 350 316 350"
            stroke="var(--spiral-stroke)"
            strokeWidth="0.6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}
