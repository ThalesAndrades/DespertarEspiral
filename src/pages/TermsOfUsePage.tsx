import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

const CONTACT_EMAIL = "contato@despertarespiral.com";
const SITE_NAME = "Despertar Espiral";

const READING_WIDTH = "68ch";

function SectionTitle({ children }: { children: string }) {
  return (
    <h2
      className="font-label"
      style={{
        maxWidth: READING_WIDTH,
        marginTop: "40px",
        marginBottom: "12px",
        fontSize: "11px",
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "var(--gold)",
        fontWeight: 600,
        scrollMarginTop: "84px",
      }}
    >
      {children}
    </h2>
  );
}

function P({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-pretty"
      style={{
        maxWidth: READING_WIDTH,
        fontSize: "15.5px",
        lineHeight: 1.9,
        color: "var(--text-secondary)",
        marginBottom: "14px",
      }}
    >
      {children}
    </p>
  );
}

function List({ children }: { children: ReactNode }) {
  return (
    <ul style={{ maxWidth: READING_WIDTH, margin: "0 0 14px", paddingLeft: "20px" }}>
      {children}
    </ul>
  );
}

function Li({ children }: { children: ReactNode }) {
  return (
    <li
      className="text-pretty"
      style={{ marginBottom: "10px", lineHeight: 1.85, color: "var(--text-secondary)", fontSize: "15.5px", paddingLeft: "4px" }}
    >
      {children}
    </li>
  );
}

export default function TermsOfUsePage() {
  const title = `Termos de Uso — ${SITE_NAME}`;
  const description = "Regras e condições para uso do site e plataforma Despertar Espiral.";
  const canonical = "https://despertarespiral.com/termos";

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg-surface)", color: "var(--text-primary)" }}>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonical} />
      </Helmet>

      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "var(--nav-bg)",
          borderBottom: "1px solid var(--border-subtle)",
          backdropFilter: "blur(20px) saturate(1.3)",
          WebkitBackdropFilter: "blur(20px) saturate(1.3)",
        }}
      >
        <div
          style={{
            maxWidth: "980px",
            margin: "0 auto",
            padding: "14px clamp(16px,4vw,24px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <Link
            to="/"
            className="font-label"
            style={{
              fontSize: "9px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              textDecoration: "none",
              minHeight: "44px",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            ← Voltar
          </Link>
          <div className="font-label" style={{ fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--text-faint)" }}>
            Termos de Uso
          </div>
        </div>
      </div>

      <main style={{ maxWidth: "980px", margin: "0 auto", padding: "clamp(28px,6vw,54px) clamp(16px,4vw,24px) 64px" }}>
        <p className="overline" style={{ color: "var(--gold)", marginBottom: "10px" }}>
          Clareza e responsabilidade
        </p>
        <h1
          className="font-display text-balance"
          style={{
            fontSize: "clamp(30px,5vw,52px)",
            fontWeight: 300,
            lineHeight: 1.1,
            marginBottom: "18px",
          }}
        >
          Termos de Uso
        </h1>
        <hr className="divider-gold" style={{ maxWidth: READING_WIDTH, marginBottom: "24px" }} />
        <P>
          Estes Termos de Uso regem o acesso e uso do site e da plataforma {SITE_NAME} (o “Serviço”). Ao acessar ou usar o Serviço, você concorda com
          estes Termos.
        </P>

        <div className="card-dark" style={{ maxWidth: READING_WIDTH, padding: "22px 24px", marginTop: "8px", marginBottom: "8px", borderRadius: "var(--r-lg)" }}>
          <p className="font-label" style={{ fontSize: "9px", letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "12px" }}>
            Resumo
          </p>
          <ul style={{ margin: 0, paddingLeft: "18px" }}>
            <Li>Você deve fornecer informações corretas e manter sua conta segura.</Li>
            <Li>O conteúdo é protegido por direitos autorais e não pode ser redistribuído.</Li>
            <Li>O acesso pode ser suspenso em caso de abuso, fraude ou violação destes Termos.</Li>
            <Li>Dúvidas: {CONTACT_EMAIL}.</Li>
          </ul>
        </div>

        <SectionTitle>1. Elegibilidade e conta</SectionTitle>
        <P>
          Para usar determinadas funcionalidades, você pode precisar criar uma conta. Você é responsável por manter a confidencialidade das credenciais e
          por todas as atividades realizadas em sua conta.
        </P>

        <SectionTitle>2. Uso permitido</SectionTitle>
        <P>Você concorda em usar o Serviço apenas para finalidades legítimas e de acordo com estes Termos. É proibido:</P>
        <List>
          <Li>Violar leis, regulamentos ou direitos de terceiros.</Li>
          <Li>Tentar obter acesso não autorizado, explorar vulnerabilidades ou interferir no funcionamento do Serviço.</Li>
          <Li>Automatizar acessos abusivos, coletar dados de forma não autorizada ou realizar engenharia reversa indevida.</Li>
          <Li>Publicar conteúdo ofensivo, discriminatório, ilegal ou que viole direitos autorais em áreas de comunidade.</Li>
        </List>

        <SectionTitle>3. Conteúdo, propriedade intelectual e licenças</SectionTitle>
        <P>
          O conteúdo disponibilizado no Serviço (aulas, materiais, textos, vídeos, marcas e elementos visuais) é protegido por direitos autorais e demais
          direitos de propriedade intelectual.
        </P>
        <P>
          É concedida a você uma licença limitada, não exclusiva e intransferível para acessar e consumir o conteúdo para uso pessoal, não comercial,
          conforme seu plano e permissões.
        </P>
        <P>Você não pode copiar, redistribuir, vender, sublicenciar, compartilhar ou disponibilizar publicamente o conteúdo sem autorização expressa.</P>

        <SectionTitle>4. Compras, pagamentos e acesso</SectionTitle>
        <P>
          Quando aplicável, o acesso a produtos e conteúdos pode depender da confirmação de pagamento. Podemos registrar status de pedido e liberar acesso
          à conta correspondente.
        </P>

        <SectionTitle>5. Comunidade e conteúdo gerado por usuários</SectionTitle>
        <P>
          Se o Serviço disponibilizar comunidade, você é responsável pelo que publica. Podemos moderar, ocultar ou remover conteúdos que violem estes Termos
          ou regras de convivência do Serviço.
        </P>

        <SectionTitle>6. Login com Google (OAuth)</SectionTitle>
        <P>
          Se você optar por entrar usando Google, o Serviço utilizará o fluxo OAuth para autenticação. Nós não solicitamos sua senha do Google. As
          informações recebidas são usadas para login e gestão de conta, conforme descrito na Política de Privacidade.
        </P>

        <SectionTitle>7. Suspensão e encerramento</SectionTitle>
        <P>
          Podemos suspender ou encerrar o acesso ao Serviço, total ou parcialmente, quando houver indícios razoáveis de fraude, abuso, violação destes
          Termos, risco de segurança ou exigência legal. Você pode solicitar encerramento de conta e exclusão de dados conforme a Política de Privacidade.
        </P>

        <SectionTitle>8. Isenção de garantias e limitação de responsabilidade</SectionTitle>
        <P>
          O Serviço é fornecido “como está”, podendo passar por atualizações e melhorias. Na máxima extensão permitida por lei, não garantimos que o
          Serviço será ininterrupto ou livre de erros. Não nos responsabilizamos por danos indiretos decorrentes do uso ou impossibilidade de uso do
          Serviço, salvo quando a lei determinar de forma diversa.
        </P>

        <SectionTitle>9. Alterações</SectionTitle>
        <P>
          Podemos atualizar estes Termos periodicamente. A versão mais recente estará sempre disponível nesta página. Se as mudanças forem relevantes,
          poderemos notificar por meios razoáveis.
        </P>

        <SectionTitle>10. Contato</SectionTitle>
        <P>
          Para dúvidas sobre estes Termos, entre em contato em{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}>
            {CONTACT_EMAIL}
          </a>
          .
        </P>
      </main>
    </div>
  );
}
