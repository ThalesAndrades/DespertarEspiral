/**
 * Minimal Helmet / HelmetProvider shim.
 * Drop-in replacement for react-helmet-async when that package is absent.
 * Updates <title> and <meta name="description"> directly via DOM.
 */
import React, { useEffect } from "react";

interface HelmetProps {
  children?: React.ReactNode;
}

export function HelmetProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Helmet({ children }: HelmetProps) {
  useEffect(() => {
    if (!children) return;
    const nodes = React.Children.toArray(children);
    nodes.forEach((node) => {
      if (!React.isValidElement(node)) return;
      const el = node as React.ReactElement<{ children?: React.ReactNode; name?: string; content?: string }>;
      if (el.type === "title" && typeof el.props.children === "string") {
        document.title = el.props.children;
      }
      if (el.type === "meta" && el.props.name === "description" && el.props.content) {
        let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (!meta) {
          meta = document.createElement("meta");
          meta.name = "description";
          document.head.appendChild(meta);
        }
        meta.content = el.props.content;
      }
    });
  });
  return null;
}
