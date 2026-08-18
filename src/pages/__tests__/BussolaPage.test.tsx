import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const insert = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/lib/supabase", () => ({ supabase: { from: () => ({ insert }) } }));
vi.mock("@/lib/sequenzy", () => ({ fireEventAsync: vi.fn() }));

import BussolaPage from "@/pages/BussolaPage";
import { PERGUNTAS } from "@/content/bussola";

const renderPage = () => render(<MemoryRouter><BussolaPage /></MemoryRouter>);

async function responderTudo(pilarIndex: number) {
  // clica sempre na opcao do mesmo pilar para um resultado deterministico
  for (let i = 0; i < PERGUNTAS.length; i++) {
    const opcao = PERGUNTAS[i].opcoes[pilarIndex];
    await userEvent.click(await screen.findByRole("button", { name: opcao.texto }));
  }
}

beforeEach(() => {
  sessionStorage.clear();
  insert.mockClear();
});

describe("BussolaPage", () => {
  it("comeca na intro com um unico botao de iniciar", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /começar/i })).toBeInTheDocument();
  });

  it("fluxo completo: 12 respostas -> email -> resultado gravado", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /começar/i }));
    await responderTudo(2); // sempre ativacao

    // portao de email ANTES do resultado
    expect(screen.queryByText("A Represada")).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox"), "maria@exemplo.com");
    await userEvent.click(screen.getByRole("button", { name: /ver meu resultado/i }));

    // resultado certo para 12x ativacao
    expect(await screen.findByText("A Represada")).toBeInTheDocument();

    // gravou com email, respostas e resultado
    await waitFor(() => expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "maria@exemplo.com",
        pain_primary: "ativacao",
        social_archetype: "A Represada",
      })
    ));
  }, 60000);

  it("falha ao gravar NAO bloqueia o resultado (spec §6)", async () => {
    insert.mockResolvedValueOnce({ error: { message: "boom" } });
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /começar/i }));
    await responderTudo(0); // sempre consciencia
    await userEvent.type(screen.getByRole("textbox"), "maria@exemplo.com");
    await userEvent.click(screen.getByRole("button", { name: /ver meu resultado/i }));
    expect(await screen.findByText("A Adormecida")).toBeInTheDocument();
  }, 60000);

  it("retoma do meio apos reload (sessionStorage)", async () => {
    const { unmount } = renderPage();
    await userEvent.click(screen.getByRole("button", { name: /começar/i }));
    // responde 3 perguntas
    for (let i = 0; i < 3; i++) {
      await userEvent.click(await screen.findByRole("button", { name: PERGUNTAS[i].opcoes[0].texto }));
    }
    // simula reload
    unmount();
    document.body.innerHTML = "";
    renderPage();
    // deve estar na pergunta 4, nao na intro
    expect(await screen.findByRole("heading", { name: PERGUNTAS[3].texto })).toBeInTheDocument();
  });
});
