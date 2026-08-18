import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QuizProgress } from "@/components/quiz/QuizProgress";
import { QuizQuestion } from "@/components/quiz/QuizQuestion";
import { EmailGate } from "@/components/quiz/EmailGate";
import { ResultadoCard } from "@/components/quiz/ResultadoCard";
import { PERGUNTAS, ARQUETIPOS } from "@/content/bussola";

describe("QuizProgress", () => {
  it("anuncia o progresso de forma acessivel", () => {
    render(<QuizProgress atual={3} total={12} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3");
    expect(screen.getByText("3 de 12")).toBeInTheDocument();
  });
});

describe("QuizQuestion", () => {
  it("renderiza a pergunta e as 4 opcoes", () => {
    render(<QuizQuestion pergunta={PERGUNTAS[0]} onResponder={vi.fn()} />);
    expect(screen.getByRole("heading")).toHaveTextContent(PERGUNTAS[0].texto);
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("clicar numa opcao chama onResponder com id e pilar", async () => {
    const onResponder = vi.fn();
    render(<QuizQuestion pergunta={PERGUNTAS[0]} onResponder={onResponder} />);
    await userEvent.click(screen.getByRole("button", { name: PERGUNTAS[0].opcoes[2].texto }));
    expect(onResponder).toHaveBeenCalledWith(PERGUNTAS[0].opcoes[2].id, PERGUNTAS[0].opcoes[2].pilar);
  });
});

describe("EmailGate", () => {
  it("nao confirma com email invalido", async () => {
    const onConfirmar = vi.fn();
    render(<EmailGate onConfirmar={onConfirmar} enviando={false} />);
    await userEvent.type(screen.getByRole("textbox"), "nao-e-email");
    await userEvent.click(screen.getByRole("button"));
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("confirma com email valido, normalizado", async () => {
    const onConfirmar = vi.fn();
    render(<EmailGate onConfirmar={onConfirmar} enviando={false} />);
    await userEvent.type(screen.getByRole("textbox"), "  Maria@Exemplo.COM ");
    await userEvent.click(screen.getByRole("button"));
    expect(onConfirmar).toHaveBeenCalledWith("maria@exemplo.com");
  });

  it("desabilita o botao enquanto envia", () => {
    render(<EmailGate onConfirmar={vi.fn()} enviando={true} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("ResultadoCard", () => {
  it("mostra nome, titulo, leitura e o CTA para o Sete Manhas", () => {
    render(
      <MemoryRouter>
        <ResultadoCard arquetipo={ARQUETIPOS.ativacao} />
      </MemoryRouter>
    );
    expect(screen.getByText("A Represada")).toBeInTheDocument();
    expect(screen.getByText(ARQUETIPOS.ativacao.titulo)).toBeInTheDocument();
    expect(screen.getByText(ARQUETIPOS.ativacao.leitura)).toBeInTheDocument();
  });
});
