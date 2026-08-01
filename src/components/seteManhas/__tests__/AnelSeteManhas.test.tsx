import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnelSeteManhas } from "@/components/seteManhas/AnelSeteManhas";
import type { ManhaInfo } from "@/lib/seteManhas";

const trilha = (estados: Array<[ManhaInfo["estado"], boolean?]>): ManhaInfo[] =>
  estados.map(([estado, fosca], i) => ({ indice: i + 1, estado, fosca: fosca ?? false }));

describe("AnelSeteManhas", () => {
  it("renderiza os 7 pontos com estado acessivel", () => {
    render(
      <AnelSeteManhas
        trilha={trilha([["concluida"], ["concluida", true], ["disponivel"], ["bloqueada"], ["bloqueada"], ["bloqueada"], ["bloqueada"]])}
        streak={2}
      />
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect(screen.getByLabelText("Manhã 1: concluída")).toBeInTheDocument();
    expect(screen.getByLabelText("Manhã 3: disponível hoje")).toBeInTheDocument();
    expect(screen.getByLabelText("Manhã 4: ainda bloqueada")).toBeInTheDocument();
  });

  it("mostra o streak quando maior que zero", () => {
    render(<AnelSeteManhas trilha={trilha([["concluida"], ["disponivel"], ["bloqueada"], ["bloqueada"], ["bloqueada"], ["bloqueada"], ["bloqueada"]])} streak={1} />);
    expect(screen.getByText(/1 dia seguido/)).toBeInTheDocument();
  });

  it("nao mostra streak zero (sem cobranca, sem culpa)", () => {
    render(<AnelSeteManhas trilha={trilha([["concluida", true], ["disponivel"], ["bloqueada"], ["bloqueada"], ["bloqueada"], ["bloqueada"], ["bloqueada"]])} streak={0} />);
    expect(screen.queryByText(/dia seguido/)).not.toBeInTheDocument();
  });

  it("manha 'amanha' comunica o ritmo, nao a trava", () => {
    render(<AnelSeteManhas trilha={trilha([["concluida"], ["amanha"], ["bloqueada"], ["bloqueada"], ["bloqueada"], ["bloqueada"], ["bloqueada"]])} streak={1} />);
    expect(screen.getByLabelText("Manhã 2: abre amanhã")).toBeInTheDocument();
  });
});
