import { Activity, Droplet, Footprints, Heart, Scale, Target, Timer, UserRound, Users, Utensils } from "lucide-react";
import { BrandLogo, brand, metricColors } from "./brand.jsx";
import EditorialLine from "./components/EditorialLine.jsx";

const SURFACE = brand.surface;
const BORDER = brand.border;
const TEXT = brand.text;
const TEXT_MUTED = brand.textMuted;

const todayScreen = "/home/today.webp";
const trendsScreen = "/home/trends.webp";
const goalsScreen = "/home/goals.webp";

const TRACKED_ITEMS = [
  { label: "Food", Icon: Utensils, color: metricColors.food },
  { label: "Weight", Icon: Scale, color: metricColors.weight },
  { label: "Movement", Icon: Activity, color: metricColors.activity },
  { label: "Steps", Icon: Footprints, color: metricColors.steps },
  { label: "Water", Icon: Droplet, color: metricColors.water },
  { label: "Fasting", Icon: Timer, color: brand.teal },
  { label: "Goals", Icon: Target, color: brand.clay },
];

function PublicHome({ onGetStarted, onSignIn }) {
  const serif = "'Newsreader', Georgia, serif";
  const sans = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif";

  const buttonStyle = (primary = false) => ({
    minHeight: 48,
    borderRadius: 999,
    padding: "0 22px",
    border: primary ? `1px solid ${brand.teal}` : `1px solid ${BORDER}`,
    background: primary ? brand.teal : "rgba(255,255,255,.9)",
    color: primary ? brand.inkOn : TEXT,
    fontSize: 14,
    fontWeight: 750,
    fontFamily: sans,
    cursor: "pointer",
    boxShadow: primary ? "0 8px 22px rgba(31,94,87,.16)" : "0 2px 8px rgba(32,35,31,.04)",
  });

  function PhoneFrame({ src, alt }) {
    return (
      <div className="with-home-phone-wrap">
        <div className="with-home-phone">
          <div className="with-home-phone-speaker" aria-hidden="true" />
          <div className="with-home-phone-screen">
            <img
              src={src}
              alt={alt}
              width="520"
              height="1132"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </div>
        </div>
      </div>
    );
  }

  function EditorialScreen({ src, alt, width, height, tilt = 0, label }) {
    return (
      <figure className="with-home-screen-card" style={{ transform: `rotate(${tilt}deg)` }}>
        <figcaption className="with-home-screen-label">{label}</figcaption>
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
        />
      </figure>
    );
  }

  return (
    <div className="with-home">
      <style>{`
        .with-home {
          min-height: 100vh;
          min-height: 100dvh;
          color: ${TEXT};
          font-family: ${sans};
          background:
            radial-gradient(circle at 88% 8%, rgba(242,201,109,.18) 0, rgba(242,201,109,0) 24rem),
            radial-gradient(circle at 5% 42%, rgba(183,200,191,.22) 0, rgba(183,200,191,0) 25rem),
            ${brand.bg};
          overflow-x: hidden;
        }
        .with-home * { box-sizing: border-box; }
        .with-home button, .with-home a { font-family: inherit; }
        .with-home button:focus-visible, .with-home a:focus-visible {
          outline: 3px solid rgba(31,94,87,.28);
          outline-offset: 3px;
        }
        .with-home-header {
          width: min(1180px, calc(100% - 48px));
          margin: 0 auto;
          padding: 22px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          position: relative;
          z-index: 5;
        }
        .with-home-nav-actions { display:flex; gap:8px; align-items:center; }
        .with-home-hero {
          width: min(1120px, calc(100% - 48px));
          margin: 0 auto;
          padding: 58px 0 96px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(330px, .72fr);
          align-items: center;
          gap: clamp(44px, 7vw, 94px);
          position: relative;
        }
        .with-home-hero:before {
          content: "";
          position: absolute;
          width: 270px;
          height: 270px;
          right: -140px;
          bottom: 10px;
          border: 1px solid rgba(31,94,87,.10);
          border-radius: 48% 52% 45% 55% / 58% 43% 57% 42%;
          transform: rotate(18deg);
          pointer-events: none;
        }
        .with-home-kicker {
          color: ${brand.tealDark};
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .12em;
          margin-bottom: 16px;
        }
        .with-home-title {
          margin: 0;
          max-width: 700px;
          font-family: ${serif};
          font-size: clamp(52px, 6.4vw, 78px);
          line-height: .94;
          letter-spacing: -.045em;
          font-weight: 600;
          text-wrap: balance;
        }
        .with-home-title em { color: ${brand.teal}; font-weight: 500; }
        .with-home-lede {
          max-width: 620px;
          color: ${TEXT_MUTED};
          font-size: 18px;
          line-height: 1.62;
          margin: 26px 0 24px;
        }
        .with-home-actions { display:flex; flex-wrap:wrap; gap:10px; }
        .with-home-note {
          color: ${TEXT_MUTED};
          font-size: 12px;
          line-height: 1.55;
          margin-top: 17px;
          max-width: 620px;
        }
        .with-home-track-list {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          list-style: none;
          padding: 0;
          margin: 22px 0 0;
        }
        .with-home-track-list li {
          border: 1px solid ${BORDER};
          background: rgba(255,255,255,.68);
          border-radius: 999px;
          padding: 7px 11px 7px 8px;
          color: ${TEXT_MUTED};
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .with-home-track-icon {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          display: inline-grid;
          place-items: center;
          background: color-mix(in srgb, var(--metric-color) 14%, white);
          color: var(--metric-color);
          flex: 0 0 auto;
        }
        .with-home-phone-wrap {
          position: relative;
          width: min(332px, 85vw);
          margin: 0 auto;
          filter: drop-shadow(0 34px 50px rgba(27,52,46,.20));
        }
        .with-home-phone-wrap:before {
          content: "";
          position: absolute;
          width: 78%;
          height: 36%;
          right: -30%;
          top: 18%;
          background: ${brand.clay};
          opacity: .17;
          border-radius: 49% 51% 62% 38% / 47% 43% 57% 53%;
          transform: rotate(-18deg);
          z-index: -2;
        }
        .with-home-phone-wrap:after {
          content: "";
          position: absolute;
          width: 54%;
          height: 21%;
          left: -27%;
          bottom: 8%;
          background: ${brand.sun};
          opacity: .22;
          border-radius: 58% 42% 45% 55% / 50%;
          transform: rotate(17deg);
          z-index: -2;
        }
        .with-home-phone {
          position: relative;
          background: #232927;
          padding: 10px;
          border-radius: 48px;
          border: 1px solid rgba(255,255,255,.12);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.05), 0 2px 0 rgba(255,255,255,.08);
        }
        .with-home-phone:before,
        .with-home-phone:after {
          content: "";
          position: absolute;
          left: -3px;
          width: 3px;
          border-radius: 3px 0 0 3px;
          background: #1b201f;
        }
        .with-home-phone:before { top: 118px; height: 58px; }
        .with-home-phone:after { top: 190px; height: 78px; }
        .with-home-phone-speaker {
          position: absolute;
          top: 15px;
          left: 50%;
          width: 66px;
          height: 17px;
          margin-left: -33px;
          background: #141817;
          border-radius: 999px;
          z-index: 2;
          box-shadow: inset 0 1px 2px rgba(255,255,255,.04);
        }
        .with-home-phone-screen {
          overflow: hidden;
          border-radius: 39px;
          background: ${brand.bg};
          aspect-ratio: 520 / 1132;
        }
        .with-home-phone-screen img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .with-home-philosophy {
          position: relative;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(255,255,255,.58), rgba(244,241,234,.86));
          border-top: 1px solid ${BORDER};
          border-bottom: 1px solid ${BORDER};
        }
        .with-home-philosophy:before {
          content: "";
          position: absolute;
          width: 230px;
          height: 145px;
          right: 7%;
          top: -58px;
          background: ${brand.sun};
          opacity: .22;
          border-radius: 52% 48% 62% 38% / 52% 38% 62% 48%;
          transform: rotate(-8deg);
          pointer-events: none;
        }
        .with-home-philosophy-inner {
          width: min(900px, calc(100% - 48px));
          margin: 0 auto;
          padding: 78px 0 82px;
          position: relative;
          z-index: 1;
          text-align: center;
        }
        .with-home-philosophy-mark {
          width: 46px;
          height: 46px;
          margin: 0 auto 18px;
          border-radius: 48% 52% 43% 57% / 56% 45% 55% 44%;
          display: grid;
          place-items: center;
          background: rgba(31,94,87,.09);
          color: ${brand.tealDark};
          transform: rotate(-4deg);
        }
        .with-home-philosophy-copy {
          font-family: ${serif};
          font-size: clamp(35px, 4.7vw, 54px);
          line-height: 1.02;
          letter-spacing: -.032em;
          font-weight: 500;
          margin: 8px auto 15px;
          max-width: 820px;
          text-wrap: balance;
        }
        .with-home-philosophy-copy strong {
          color: ${brand.teal};
          font-weight: 600;
        }
        .with-home-philosophy-note {
          max-width: 650px;
          margin: 0 auto;
          color: ${TEXT_MUTED};
          font-size: 15px;
          line-height: 1.62;
        }
        .with-home-story { width: min(1100px, calc(100% - 48px)); margin: 0 auto; padding: 104px 0 112px; }
        .with-home-story-row {
          display: grid;
          grid-template-columns: minmax(300px, .9fr) minmax(0, 1.1fr);
          gap: clamp(48px, 8vw, 104px);
          align-items: center;
          margin-bottom: 108px;
        }
        .with-home-story-row.reverse { grid-template-columns: minmax(0, 1.05fr) minmax(300px, .95fr); }
        .with-home-story-row.reverse .with-home-story-copy { order: 2; }
        .with-home-story-row.reverse .with-home-screen-stage { order: 1; }
        .with-home-story-copy h2 {
          font-family: ${serif};
          font-size: clamp(40px, 4.6vw, 58px);
          line-height: .99;
          letter-spacing: -.035em;
          font-weight: 600;
          margin: 0 0 18px;
          text-wrap: balance;
        }
        .with-home-story-copy p {
          color: ${TEXT_MUTED};
          font-size: 16px;
          line-height: 1.68;
          margin: 0 0 16px;
          max-width: 560px;
        }
        .with-home-rule { width: 74px; height: 5px; border-radius: 99px; background: ${brand.clay}; margin-bottom: 25px; }
        .with-home-screen-stage {
          position: relative;
          min-height: 520px;
          display: grid;
          place-items: center;
          padding: 30px 0;
        }
        .with-home-screen-stage:before {
          content: "";
          position: absolute;
          inset: 8% 10%;
          border: 1px solid ${BORDER};
          border-radius: 44% 56% 48% 52% / 58% 42% 58% 42%;
          transform: rotate(-7deg);
          pointer-events: none;
        }
        .with-home-screen-card {
          width: min(360px, 85vw);
          padding: 10px;
          margin: 0;
          border-radius: 24px;
          background: ${SURFACE};
          border: 1px solid rgba(231,227,219,.95);
          box-shadow: 0 28px 60px rgba(35,42,38,.13);
          position: relative;
          z-index: 1;
        }
        .with-home-screen-card img { width: 100%; height: auto; display: block; border-radius: 17px; }
        .with-home-screen-label {
          position: absolute;
          right: -14px;
          top: -15px;
          background: ${brand.sun};
          color: ${TEXT};
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .08em;
          transform: rotate(5deg);
          box-shadow: 0 5px 14px rgba(40,37,28,.10);
        }
        .with-home-quote {
          width: min(860px, calc(100% - 48px));
          margin: 0 auto;
          padding: 10px 0 112px;
          text-align: center;
          position: relative;
        }
        .with-home-quote-mark {
          font-family: ${serif};
          font-size: 86px;
          line-height: .62;
          color: ${brand.sun};
          margin-bottom: 20px;
          user-select: none;
        }
        .with-home-quote [data-editorial-placement="homepage"] > div:first-child {
          font-family: ${serif};
          font-size: clamp(29px, 4.1vw, 45px);
          line-height: 1.14;
          letter-spacing: -.02em;
          font-style: italic;
          font-weight: 500;
          text-wrap: balance;
        }
        .with-home-quote [data-editorial-placement="homepage"] > div + div {
          font-family: ${sans};
          font-size: 11px !important;
          font-style: normal;
          text-transform: uppercase;
          letter-spacing: .09em;
          font-weight: 800;
          color: ${TEXT_MUTED};
          margin-top: 16px !important;
          opacity: 1 !important;
        }
        .with-home-solo { background: ${brand.stone}; border-top: 1px solid ${BORDER}; border-bottom: 1px solid ${BORDER}; }
        .with-home-solo-inner {
          width: min(1080px, calc(100% - 48px));
          margin: 0 auto;
          padding: 80px 0;
          display: grid;
          grid-template-columns: .9fr 1.1fr;
          gap: clamp(38px, 8vw, 100px);
          align-items: center;
        }
        .with-home-solo h2 {
          font-family: ${serif};
          font-size: clamp(39px, 4.5vw, 54px);
          line-height: 1;
          letter-spacing: -.03em;
          font-weight: 600;
          margin: 0;
          text-wrap: balance;
        }
        .with-home-solo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .with-home-solo-card {
          background: ${SURFACE};
          border: 1px solid ${BORDER};
          border-radius: 18px;
          padding: 22px;
          min-height: 180px;
        }
        .with-home-solo-icon {
          width: 36px;
          height: 36px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: ${brand.tealDark};
          background: rgba(31,94,87,.08);
          margin-bottom: 15px;
        }
        .with-home-solo-card:nth-child(2) .with-home-solo-icon {
          color: ${brand.clay};
          background: rgba(203,119,83,.10);
        }
        .with-home-solo-card strong { display: block; font-family: ${serif}; font-size: 26px; font-weight: 600; margin-bottom: 8px; }
        .with-home-solo-card p { color: ${TEXT_MUTED}; font-size: 14px; line-height: 1.58; margin: 0; }
        .with-home-final {
          width: min(1050px, calc(100% - 48px));
          margin: 0 auto;
          padding: 106px 0 70px;
          text-align: center;
        }
        .with-home-final h2 {
          font-family: ${serif};
          font-size: clamp(46px, 6vw, 70px);
          line-height: .96;
          letter-spacing: -.04em;
          font-weight: 600;
          max-width: 760px;
          margin: 0 auto 22px;
          text-wrap: balance;
        }
        .with-home-final p { color: ${TEXT_MUTED}; font-size: 16px; line-height: 1.6; max-width: 610px; margin: 0 auto 28px; }
        .with-home-footer {
          width: min(1120px, calc(100% - 48px));
          margin: 0 auto;
          padding: 24px 0 34px;
          border-top: 1px solid ${BORDER};
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          color: ${TEXT_MUTED};
          font-size: 11px;
        }
        @media (max-width: 860px) {
          .with-home-hero { grid-template-columns: 1fr; text-align: center; padding-top: 42px; }
          .with-home-lede, .with-home-note { margin-left:auto; margin-right:auto; }
          .with-home-actions, .with-home-track-list { justify-content:center; }
          .with-home-solo-inner { grid-template-columns: 1fr; }
          .with-home-story-row, .with-home-story-row.reverse { grid-template-columns: 1fr; gap: 36px; margin-bottom: 84px; }
          .with-home-story-row.reverse .with-home-story-copy, .with-home-story-row.reverse .with-home-screen-stage { order: initial; }
          .with-home-story-copy { text-align:center; }
          .with-home-story-copy p { margin-left:auto; margin-right:auto; }
          .with-home-rule { margin-left:auto; margin-right:auto; }
          .with-home-screen-stage { min-height: 0; padding: 28px 0; }
        }
        @media (max-width: 540px) {
          .with-home-header, .with-home-hero, .with-home-philosophy-inner, .with-home-story, .with-home-quote, .with-home-solo-inner, .with-home-final, .with-home-footer {
            width: min(100% - 34px, 1120px);
          }
          .with-home-header { padding-top: 17px; }
          .with-home-nav-start { display:none; }
          .with-home-hero { padding-bottom: 76px; }
          .with-home-title { font-size: clamp(44px, 13.2vw, 50px); }
          .with-home-lede { font-size: 16px; }
          .with-home-actions { display:grid; grid-template-columns:1fr; }
          .with-home-actions button { width:100%; }
          .with-home-track-list { gap: 6px; }
          .with-home-track-list li { padding: 7px 10px; }
          .with-home-phone-wrap { width: min(286px, 82vw); }
          .with-home-phone { border-radius: 42px; padding: 9px; }
          .with-home-phone-screen { border-radius: 34px; }
          .with-home-philosophy-inner { padding: 60px 0 64px; }
          .with-home-quote { padding-bottom: 82px; }
          .with-home-story { padding: 78px 0 88px; }
          .with-home-screen-card { width: min(315px, 86vw); }
          .with-home-solo-grid { grid-template-columns: 1fr; }
          .with-home-solo-card { min-height: 0; }
          .with-home-final { padding-top: 82px; }
          .with-home-footer { align-items:flex-start; flex-direction:column; }
        }
      `}</style>

      <header className="with-home-header">
        <BrandLogo style={{ width: 126 }} />
        <nav className="with-home-nav-actions" aria-label="Account">
          <button
            type="button"
            onClick={onSignIn}
            style={{ ...buttonStyle(false), background: "transparent", borderColor: "transparent", boxShadow: "none" }}
          >
            Sign in
          </button>
          <button className="with-home-nav-start" type="button" onClick={onGetStarted} style={buttonStyle(true)}>
            Get started
          </button>
        </nav>
      </header>

      <main>
        <section className="with-home-hero" aria-labelledby="with-home-title">
          <div>
            <div className="with-home-kicker">Private health tracking for real life</div>
            <h1 id="with-home-title" className="with-home-title">
              Take care of yourself. <em>With people who care about you.</em>
            </h1>
            <p className="with-home-lede">
              Track food, weight, movement, steps, water, fasting and goals in one calm place. Start with yourself. Invite someone you trust when support would help.
            </p>
            <div className="with-home-actions">
              <button type="button" onClick={onGetStarted} style={{ ...buttonStyle(true), minHeight: 52, fontSize: 15 }}>
                Get started
              </button>
              <button type="button" onClick={onSignIn} style={{ ...buttonStyle(false), minHeight: 52, fontSize: 15 }}>
                I already use With
              </button>
            </div>
            <div className="with-home-note">
              Private by default. No public feed. No leaderboards. Each person keeps their own goals and health information.
            </div>
            <ul className="with-home-track-list" aria-label="Things you can track with With">
              {TRACKED_ITEMS.map(({ label, Icon, color }) => (
                <li key={label}>
                  <span className="with-home-track-icon" style={{ "--metric-color": color }} aria-hidden="true"><Icon size={13} strokeWidth={2.1} /></span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <PhoneFrame src={todayScreen} alt="With Today screen showing daily health tracking" />
        </section>

        <section className="with-home-philosophy" aria-labelledby="with-home-philosophy-title">
          <div className="with-home-philosophy-inner">
            <div className="with-home-philosophy-mark" aria-hidden="true"><Heart size={21} strokeWidth={1.9} /></div>
            <div className="with-home-kicker">Built around people, not performance</div>
            <h2 id="with-home-philosophy-title" className="with-home-philosophy-copy">
              <strong>Health is personal.</strong> Support can be shared.
            </h2>
            <p className="with-home-philosophy-note">
              With keeps those two things from getting confused. Your goals and health information stay yours, while the people you trust can still be part of the experience.
            </p>
          </div>
        </section>

        <section className="with-home-story" aria-label="How With approaches progress">
          <div className="with-home-story-row">
            <div className="with-home-story-copy">
              <div className="with-home-rule" aria-hidden="true" />
              <div className="with-home-kicker">Notice, don’t judge</div>
              <h2>See the pattern, not just the day.</h2>
              <p>A single day rarely tells the whole story. With helps you notice patterns, trends and small changes without turning every number into a verdict.</p>
              <p>The point isn’t a perfect streak. It’s better information about the life you’re actually living.</p>
            </div>
            <div className="with-home-screen-stage">
              <EditorialScreen
                src={trendsScreen}
                alt="With Trends screen showing a recent insight and weight trend"
                width="1000"
                height="1017"
                tilt={-2.2}
                label="Your trends"
              />
            </div>
          </div>

          <div className="with-home-story-row reverse" style={{ marginBottom: 0 }}>
            <div className="with-home-story-copy">
              <div className="with-home-rule" style={{ background: brand.sun }} aria-hidden="true" />
              <div className="with-home-kicker">Your definition of progress</div>
              <h2>Your goals are yours.</h2>
              <p>Set what matters to you, whether that’s a number, a habit, a feeling or simply paying closer attention. Someone you’re With can be working toward something completely different.</p>
              <p>Sharing the experience never means sharing the same body, targets or definition of progress.</p>
            </div>
            <div className="with-home-screen-stage">
              <EditorialScreen
                src={goalsScreen}
                alt="With Goals screen showing a personal goal and progress"
                width="1000"
                height="1313"
                tilt={2.1}
                label="Your goals"
              />
            </div>
          </div>
        </section>

        <section className="with-home-quote" aria-label="A thought from the With editorial library">
          <div className="with-home-quote-mark" aria-hidden="true">“</div>
          <EditorialLine
            placement="homepage"
            fallback="A little consistency can be gentler than a lot of intensity."
            style={{ maxWidth: 820, margin: "0 auto" }}
            attributionStyle={{}}
          />
        </section>

        <section className="with-home-solo" aria-labelledby="with-home-solo-title">
          <div className="with-home-solo-inner">
            <div>
              <div className="with-home-kicker">Use it your way</div>
              <h2 id="with-home-solo-title">Start with yourself. Add people only when it helps.</h2>
            </div>
            <div className="with-home-solo-grid">
              <div className="with-home-solo-card">
                <div className="with-home-solo-icon" aria-hidden="true"><UserRound size={18} strokeWidth={2} /></div>
                <strong>On your own</strong>
                <p>Use With as a fully useful private tracker from day one. No invitation is required.</p>
              </div>
              <div className="with-home-solo-card">
                <div className="with-home-solo-icon" aria-hidden="true"><Users size={18} strokeWidth={2} /></div>
                <strong>With someone</strong>
                <p>Invite a partner, friend or family member when it helps. Each of you keeps your own goals, targets and health information.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="with-home-final" aria-labelledby="with-home-final-title">
          <div className="with-home-kicker">We’re in this together.</div>
          <h2 id="with-home-final-title">Start with your own health. Add support when it feels useful.</h2>
          <p>Your data, your goals, your pace. With gives the relationship room to grow without making it a requirement.</p>
          <button type="button" onClick={onGetStarted} style={{ ...buttonStyle(true), minHeight: 52, padding: "0 28px", fontSize: 15 }}>
            Get started with With
          </button>
        </section>
      </main>

      <footer className="with-home-footer">
        <span>With · We’re in this together.</span>
        <a href="/privacy" style={{ color: TEXT_MUTED, fontWeight: 700, textDecoration: "none" }}>Privacy policy</a>
      </footer>
    </div>
  );
}

export default PublicHome;
