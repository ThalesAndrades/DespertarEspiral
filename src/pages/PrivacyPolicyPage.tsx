import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

const CONTACT_EMAIL = "contato@despertarespiral.com";
const SITE_NAME = "Despertar Espiral";

function SectionTitle({ children }: { children: string }) {
  return (
    <h2
      className="font-label"
      style={{
        marginTop: "28px",
        marginBottom: "10px",
        fontSize: "11px",
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "var(--gold)",
        fontWeight: 600,
      }}
    >
      {children}
    </h2>
  );
}

function P({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontSize: "15px",
        lineHeight: 1.9,
        color: "var(--text-secondary)",
        marginBottom: "12px",
      }}
    >
      {children}
    </p>
  );
}

function Li({ children }: { children: ReactNode }) {
  return (
    <li style={{ marginBottom: "10px", lineHeight: 1.85, color: "var(--text-secondary)", fontSize: "15px" }}>
      {children}
    </li>
  );
}

export default function PrivacyPolicyPage() {
  const title = `Política de Privacidade — ${SITE_NAME}`;
  const description =
    "Entenda quais dados coletamos, como usamos, com quem compartilhamos e como você pode exercer seus direitos.";
  const canonical = "https://despertarespiral.com/privacidade";

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
            Política de Privacidade
          </div>
        </div>
      </div>

      <main style={{ maxWidth: "980px", margin: "0 auto", padding: "clamp(28px,6vw,54px) clamp(16px,4vw,24px) 64px" }}>
        <p className="overline" style={{ color: "var(--gold)", marginBottom: "10px" }}>
          Transparência e cuidado
        </p>
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(30px,5vw,52px)",
            fontWeight: 300,
            lineHeight: 1.1,
            marginBottom: "14px",
          }}
        >
          Política de Privacidade
        </h1>
        <P>
          Esta Política de Privacidade descreve como {SITE_NAME} (“nós”) coleta, usa, compartilha e protege dados pessoais quando você usa nosso site e
          plataforma (o “Serviço”).
        </P>
        <P>
          Ao usar o Serviço, você concorda com esta Política. Se não concordar, recomendamos que não utilize o Serviço.
        </P>

        <div className="card-dark" style={{ padding: "18px 18px", marginTop: "18px" }}>
          <p className="font-label" style={{ fontSize: "9px", letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "8px" }}>
            Resumo
          </p>
          <ul style={{ margin: 0, paddingLeft: "18px" }}>
            <Li>Usamos seus dados para autenticação, entrega do conteúdo, suporte e melhoria do Serviço.</Li>
            <Li>Podemos compartilhar dados com provedores essenciais (ex.: autenticação, banco de dados, e-mail) sob obrigações de segurança.</Li>
            <Li>Se você se autenticar com Google, usamos dados básicos de perfil apenas para login e gestão de conta.</Li>
            <Li>Você pode solicitar acesso, correção ou exclusão de dados pelo e-mail {CONTACT_EMAIL}.</Li>
          </ul>
        </div>

        <SectionTitle>1. Dados que coletamos</SectionTitle>
        <P>Podemos coletar as seguintes categorias de dados pessoais, conforme aplicável:</P>
        <ul style={{ margin: 0, paddingLeft: "18px" }}>
          <Li>
            <strong>Dados de conta</strong>: e-mail, nome e identificadores internos necessários para login e criação de perfil.
          </Li>
          <Li>
            <strong>Dados de autenticação</strong>: tokens e eventos de login para manter sua sessão segura.
          </Li>
          <Li>
            <strong>Dados de compra e acesso</strong>: produto adquirido, status de pagamento, datas e registros que liberam acesso ao conteúdo.
          </Li>
          <Li>
            <strong>Dados de uso</strong>: páginas visitadas e eventos básicos para diagnóstico, segurança e melhoria do Serviço.
          </Li>
          <Li>
            <strong>Dados de comunidade</strong>: publicações, comentários e interações quando você usa áreas sociais do Serviço.
          </Li>
        </ul>

        <SectionTitle>2. Como usamos seus dados</SectionTitle>
        <P>Usamos dados pessoais para:</P>
        <ul style={{ margin: 0, paddingLeft: "18px" }}>
          <Li>Autenticar você e proteger sua conta contra uso indevido.</Li>
          <Li>Entregar o conteúdo e as funcionalidades do Serviço (inclusive liberar acesso quando aplicável).</Li>
          <Li>Processar solicitações de suporte e comunicações operacionais.</Li>
          <Li>Melhorar experiência, performance e estabilidade do Serviço.</Li>
          <Li>Prevenir fraudes, abusos, e cumprir obrigações legais quando necessário.</Li>
        </ul>

        <SectionTitle>3. Base legal (LGPD)</SectionTitle>
        <P>
          Tratamos dados pessoais com base em uma ou mais hipóteses legais, conforme o caso, incluindo: execução de contrato (prestação do Serviço),
          legítimo interesse (segurança e melhoria), consentimento (quando aplicável) e cumprimento de obrigação legal/regulatória.
        </P>

        <SectionTitle>4. Compartilhamento com terceiros</SectionTitle>
        <P>
          Compartilhamos dados apenas quando necessário para operar o Serviço, com provedores que atuam como operadores/processadores, sob contratos e
          medidas de segurança. Exemplos:
        </P>
        <ul style={{ margin: 0, paddingLeft: "18px" }}>
          <Li>
            <strong>Infraestrutura e banco de dados</strong> (ex.: autenticação e persistência de dados).
          </Li>
          <Li>
            <strong>Envio de e-mails e automações</strong> (ex.: comunicações transacionais e suporte).
          </Li>
          <Li>
            <strong>Login social</strong> (ex.: Google OAuth, quando você escolher entrar com Google).
          </Li>
        </ul>
        <P>Não vendemos dados pessoais. Não compartilhamos dados para publicidade comportamental baseada em informações sensíveis.</P>

        <SectionTitle>5. Uso de dados do Google (OAuth)</SectionTitle>
        <P>
          Quando você escolhe “Continuar com Google”, podemos receber informações básicas da sua Conta Google (como e-mail e, quando disponível, nome e
          foto de perfil) para autenticar você e criar/gerenciar sua conta no Serviço.
        </P>
        <P>
          O acesso e uso de informações recebidas de APIs do Google obedecem à{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}>
            Google API Services User Data Policy
          </a>
          , incluindo os requisitos de “Limited Use”. Nós não usamos dados do Google para fins de publicidade; não permitimos que terceiros os usem para
          publicidade; e limitamos o uso ao funcionamento do login e à prestação do Serviço.
        </P>

        <SectionTitle>6. Cookies e tecnologias similares</SectionTitle>
        <P>
          Podemos usar cookies e tecnologias similares para manter sua sessão, lembrar preferências (como tema) e melhorar a experiência. Você pode
          gerenciar cookies pelo seu navegador, mas isso pode impactar funcionalidades.
        </P>

        <SectionTitle>7. Segurança</SectionTitle>
        <P>
          Adotamos medidas técnicas e organizacionais para proteger dados pessoais, incluindo controles de acesso, criptografia em trânsito e boas
          práticas de autenticação. Ainda assim, nenhum sistema é 100% seguro; por isso, recomendamos que você use senha forte e não compartilhe credenciais.
        </P>

        <SectionTitle>8. Retenção</SectionTitle>
        <P>
          Mantemos dados pessoais apenas pelo tempo necessário para cumprir as finalidades descritas nesta Política, inclusive para cumprir obrigações
          legais, resolver disputas e fazer valer nossos acordos.
        </P>

        <SectionTitle>9. Seus direitos</SectionTitle>
        <P>Você pode solicitar, conforme aplicável: confirmação do tratamento, acesso, correção, portabilidade, anonimização e exclusão de dados.</P>
        <P>
          Para exercer direitos ou solicitar exclusão da conta e dados, envie um e-mail para{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}>
            {CONTACT_EMAIL}
          </a>
          .
        </P>

        <SectionTitle>10. Crianças e adolescentes</SectionTitle>
        <P>
          O Serviço não é direcionado a crianças. Se você acredita que coletamos dados de menores sem consentimento apropriado, entre em contato para
          remoção.
        </P>

        <SectionTitle>11. Alterações nesta Política</SectionTitle>
        <P>
          Podemos atualizar esta Política periodicamente. A versão mais recente estará sempre disponível nesta página. Se as mudanças forem relevantes,
          poderemos notificar por meios razoáveis.
        </P>

        <SectionTitle>12. Contato</SectionTitle>
        <P>
          Dúvidas sobre privacidade e dados pessoais:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}>
            {CONTACT_EMAIL}
          </a>
          .
        </P>
      </main>
    </div>
  );
}
