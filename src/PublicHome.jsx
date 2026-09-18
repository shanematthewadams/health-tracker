import { BrandLogo, brand } from "./brand.jsx";
import todayScreen from "./assets/home/todayScreen.js";
import trendsScreen from "./assets/home/trendsScreen.js";
import goalsScreen from "./assets/home/goalsScreen.js";

const SURFACE = brand.surface;
const BORDER = brand.border;
const TEXT = brand.text;
const TEXT_MUTED = brand.textMuted;

function PublicHome({ onGetStarted, onSignIn }) {
  const serif = "'Newsreader', Georgia, serif";
  const sans = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif";

  const buttonStyle = (primary = false) => ({
    minHeight: 48,
    borderRadius: 999,
    padding: "0 22px",
    border: primary ? `1px solid ${brand.teal}` : `1px solid ${BORDER}`,
    background: primary ? brand.teal : "rgba(255,255,255,.82)",
    color: primary ? brand.inkOn : TEXT,
    fontSize: 14,
    fontWeight: 750,
    fontFamily: sans,
    cursor: "pointer",
    boxShadow: primary ? "0 8px 22px rgba(31,94,87,.16)" : "0 2px 8px rgba(32,35,31,.04)",
  });

  function PhoneFrame({ src, alt }) {
    return (
      <div className="with-home-phone-wrap" aria-label={alt}>
        <div className="with-home-phone">
          <div className="with-home-phone-speaker" />
          <div className="with-home-phone-screen">
            <img src={src} alt={alt} loading="eager" />
          </div>
        </div>
      </div>
    );
  }

  function EditorialScreen({ src, alt, tilt = 0, label }) {
    return (
      <div className="with-home-screen-card" style={{ transform: `rotate(${tilt}deg)` }}>
        <div className="with-home-screen-label">{label}</div>
        <img src={src} alt={alt} loading="lazy" />
      </div>
    );
  }

  return (
    <div className="with-home">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,500;1,6..72,600&display=swap');
        .with-home {
          min-height: 100vh;
          color: ${TEXT};
          font-family: ${sans};
          background:
            radial-gradient(circle at 88% 8%, rgba(242,201,109,.18) 0, rgba(242,201,109,0) 24rem),
            radial-gradient(circle at 5% 42%, rgba(183,200,191,.22) 0, rgba(183,200,191,0) 25rem),
            ${brand.bg};
          overflow: hidden;
        }
        .with-home * { box-sizing: border-box; }
        .with-home button, .with-home a { font-family: inherit; }
        .with-home button:focus-visible, .with-home a:focus-visible { outline: 3px solid rgba(31,94,87,.22); outline-offset: 3px; }
        .with-home-header { width: min(1180px, calc(100% - 48px)); margin: 0 auto; padding: 22px 0; display: flex; align-items: center; justify-content: space-between; gap: 24px; position: relative; z-index: 5; }
        .with-home-nav-actions { display:flex; gap:8px; align-items:center; }
        .with-home-hero { width: min(1120px, calc(100% - 48px)); margin: 0 auto; padding: 64px 0 104px; display: grid; grid-template-columns: minmax(0, .95fr) minmax(360px, .75fr); align-items: center; gap: clamp(48px, 7vw, 94px); position: relative; }
        .with-home-hero:before { content: ""; position: absolute; width: 270px; height: 270px; right: -140px; bottom: 10px; border: 1px solid rgba(31,94,87,.10); border-radius: 48% 52% 45% 55% / 58% 43% 57% 42%; transform: rotate(18deg); pointer-events: none; }
        .with-home-kicker { color: ${brand.tealDark}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; margin-bottom: 16px; }
        .with-home-title { margin: 0; max-width: 680px; font-family: ${serif}; font-size: clamp(52px, 6.4vw, 78px); line-height: .93; letter-spacing: -.045em; font-weight: 600; }
        .with-home-title em { color: ${brand.teal}; font-weight: 500; }
        .with-home-lede { max-width: 610px; color: ${TEXT_MUTED}; font-size: 18px; line-height: 1.62; margin: 26px 0 28px; }
        .with-home-actions { display:flex; flex-wrap:wrap; gap:10px; }
        .with-home-note { color: ${TEXT_MUTED}; font-size: 12px; line-height: 1.5; margin-top: 18px; }
        .with-home-phone-wrap { position: relative; width: min(342px, 85vw); margin: 0 auto; filter: drop-shadow(0 34px 50px rgba(27,52,46,.20)); }
        .with-home-phone-wrap:before { content: ""; position: absolute; width: 78%; height: 36%; right: -30%; top: 18%; background: ${brand.clay}; opacity: .17; border-radius: 49% 51% 62% 38% / 47% 43% 57% 53%; transform: rotate(-18deg); z-index: -2; }
        .with-home-phone-wrap:after { content: ""; position: absolute; width: 54%; height: 21%; left: -27%; bottom: 8%; background: ${brand.sun}; opacity: .22; border-radius: 58% 42% 45% 55% / 50%; transform: rotate(17deg); z-index: -2; }
        .with-home-phone { position: relative; background: #232927; padding: 11px; border-radius: 50px; border: 1px solid rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.05), 0 2px 0 rgba(255,255,255,.08); }
        .with-home-phone-speaker { position: absolute; top: 16px; left: 50%; width: 66px; height: 17px; margin-left: -33px; background: #141817; border-radius: 999px; z-index: 2; box-shadow: inset 0 1px 2px rgba(255,255,255,.04); }
        .with-home-phone-screen { overflow: hidden; border-radius: 40px; background: ${brand.bg}; aspect-ratio: 828 / 1792; }
        .with-home-phone-screen img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .with-home-manifesto { background: ${brand.teal}; color: ${brand.inkOn}; position: relative; overflow: hidden; }
        .with-home-manifesto:before { content: ""; position: absolute; inset: 0; background-image: radial-gradient(circle at 15% 20%, rgba(255,255,255,.07) 0 1px, transparent 1.5px), radial-gradient(circle at 73% 65%, rgba(255,255,255,.05) 0 1px, transparent 1.5px); background-size: 19px 19px, 27px 27px; opacity: .28; pointer-events: none; }
        .with-home-manifesto-inner { width: min(1050px, calc(100% - 48px)); margin: 0 auto; padding: 74px 0; position: relative; z-index: 1; display: grid; grid-template-columns: .75fr 1.25fr; gap: clamp(36px, 7vw, 90px); align-items: start; }
        .with-home-manifesto-small { color: rgba(255,255,255,.65); font-size: 11px; line-height: 1.5; text-transform: uppercase; letter-spacing: .12em; font-weight: 800; padding-top: 8px; }
        .with-home-manifesto-copy { font-family: ${serif}; font-size: clamp(31px, 4vw, 48px); line-height: 1.08; letter-spacing: -.025em; font-weight: 500; margin: 0; max-width: 760px; }
        .with-home-manifesto-copy em { color: ${brand.sun}; font-weight: 500; }
        .with-home-story { width: min(1100px, calc(100% - 48px)); margin: 0 auto; padding: 108px 0 120px; }
        .with-home-story-row { display: grid; grid-template-columns: minmax(300px, .9fr) minmax(0, 1.1fr); gap: clamp(48px, 8vw, 104px); align-items: center; margin-bottom: 118px; }
        .with-home-story-row.reverse { grid-template-columns: minmax(0, 1.05fr) minmax(300px, .95fr); }
        .with-home-story-row.reverse .with-home-story-copy { order: 2; }
        .with-home-story-row.reverse .with-home-screen-stage { order: 1; }
        .with-home-story-copy h2 { font-family: ${serif}; font-size: clamp(40px, 4.6vw, 58px); line-height: .98; letter-spacing: -.035em; font-weight: 600; margin: 0 0 18px; }
        .with-home-story-copy p { color: ${TEXT_MUTED}; font-size: 16px; line-height: 1.68; margin: 0 0 16px; max-width: 560px; }
        .with-home-rule { width: 74px; height: 5px; border-radius: 99px; background: ${brand.clay}; margin-bottom: 25px; }
        .with-home-screen-stage { position: relative; min-height: 580px; display: grid; place-items: center; }
        .with-home-screen-stage:before { content: ""; position: absolute; inset: 7% 10%; border: 1px solid ${BORDER}; border-radius: 44% 56% 48% 52% / 58% 42% 58% 42%; transform: rotate(-7deg); pointer-events: none; }
        .with-home-screen-card { width: min(360px, 85vw); padding: 10px; border-radius: 24px; background: rgba(255,255,255,.86); border: 1px solid rgba(231,227,219,.95); box-shadow: 0 28px 60px rgba(35,42,38,.13); position: relative; z-index: 1; backdrop-filter: blur(8px); }
        .with-home-screen-card img { width: 100%; display: block; border-radius: 17px; }
        .with-home-screen-label { position: absolute; right: -14px; top: -15px; background: ${brand.sun}; color: ${TEXT}; padding: 8px 12px; border-radius: 999px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; transform: rotate(5deg); box-shadow: 0 5px 14px rgba(40,37,28,.10); }
        .with-home-solo { background: ${brand.stone}; border-top: 1px solid ${BORDER}; border-bottom: 1px solid ${BORDER}; }
        .with-home-solo-inner { width: min(1080px, calc(100% - 48px)); margin: 0 auto; padding: 80px 0; display: grid; grid-template-columns: .9fr 1.1fr; gap: clamp(38px, 8vw, 100px); align-items: center; }
        .with-home-solo h2 { font-family: ${serif}; font-size: clamp(39px, 4.5vw, 54px); line-height: 1; letter-spacing: -.03em; font-weight: 600; margin: 0; }
        .with-home-solo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .with-home-solo-card { background: ${SURFACE}; border: 1px solid ${BORDER}; border-radius: 18px; padding: 22px; min-height: 180px; }
        .with-home-solo-card strong { display: block; font-family: ${serif}; font-size: 26px; font-weight: 600; margin-bottom: 8px; }
        .with-home-solo-card p { color: ${TEXT_MUTED}; font-size: 14px; line-height: 1.58; margin: 0; }
        .with-home-final { width: min(1050px, calc(100% - 48px)); margin: 0 auto; padding: 110px 0 72px; text-align: center; }
        .with-home-final h2 { font-family: ${serif}; font-size: clamp(46px, 6vw, 70px); line-height: .95; letter-spacing: -.04em; font-weight: 600; max-width: 760px; margin: 0 auto 22px; }
        .with-home-final p { color: ${TEXT_MUTED}; font-size: 16px; line-height: 1.6; max-width: 610px; margin: 0 auto 28px; }
        .with-home-footer { width: min(1120px, calc(100% - 48px)); margin: 0 auto; padding: 24px 0 34px; border-top: 1px solid ${BORDER}; display: flex; justify-content: space-between; align-items: center; gap: 20px; color: ${TEXT_MUTED}; font-size: 11px; }
        @media (max-width: 860px) {
          .with-home-hero { grid-template-columns: 1fr; text-align: center; padding-top: 44px; }
          .with-home-lede { margin-left:auto; margin-right:auto; }
          .with-home-actions { justify-content:center; }
          .with-home-manifesto-inner, .with-home-solo-inner { grid-template-columns: 1fr; }
          .with-home-manifesto-small { padding-top: 0; }
          .with-home-story-row, .with-home-story-row.reverse { grid-template-columns: 1fr; gap: 42px; margin-bottom: 90px; }
          .with-home-story-row.reverse .with-home-story-copy, .with-home-story-row.reverse .with-home-screen-stage { order: initial; }
          .with-home-story-copy { text-align:center; }
          .with-home-story-copy p { margin-left:auto; margin-right:auto; }
          .with-home-rule { margin-left:auto; margin-right:auto; }
          .with-home-screen-stage { min-height: 510px; }
        }
        @media (max-width: 540px) {
          .with-home-header, .with-home-hero, .with-home-manifesto-inner, .with-home-story, .with-home-solo-inner, .with-home-final, .with-home-footer { width: min(100% - 34px, 1120px); }
          .with-home-header { padding-top: 17px; }
          .with-home-nav-start { display:none; }
          .with-home-hero { padding-bottom: 82px; }
          .with-home-title { font-size: 49px; }
          .with-home-lede { font-size: 16px; }
          .with-home-actions { display:grid; grid-template-columns:1fr; }
          .with-home-actions button { width:100%; }
          .with-home-phone-wrap { width: 294px; }
          .with-home-phone { border-radius: 44px; padding: 9px; }
          .with-home-phone-screen { border-radius: 36px; }
          .with-home-manifesto-inner { padding: 60px 0; }
          .with-home-story { padding: 82px 0 92px; }
          .with-home-screen-stage { min-height: 455px; }
          .with-home-screen-card { width: min(315px, 88vw); }
          .with-home-solo-grid { grid-template-columns: 1fr; }
          .with-home-solo-card { min-height: 0; }
          .with-home-final { padding-top: 86px; }
          .with-home-footer { align-items:flex-start; flex-direction:column; }
        }
      `}</style>

      <header className="with-home-header">
        <BrandLogo style={{ width: 126 }} />
        <div className="with-home-nav-actions">
          <button type="button" onClick={onSignIn} style={{ ...buttonStyle(false), background: "transparent", borderColor: "transparent", boxShadow: "none" }}>Sign in</button>
          <button className="with-home-nav-start" type="button" onClick={onGetStarted} style={buttonStyle(true)}>Get started</button>
        </div>
      </header>

      <main>
        <section className="with-home-hero">
          <div>
            <div className="with-home-kicker">Your health, in your hands</div>
            <h1 className="with-home-title">Take care of yourself. <em>With people who care about you.</em></h1>
            <p className="with-home-lede">With is a private health tracker for the everyday things that add up. Keep an eye on food, movement, weight, water, goals and more. Start on your own. Invite someone you trust when it feels useful.</p>
            <div className="with-home-actions">
              <button type="button" onClick={onGetStarted} style={{ ...buttonStyle(true), minHeight: 52, fontSize: 15 }}>Get started</button>
              <button type="button" onClick={onSignIn} style={{ ...buttonStyle(false), minHeight: 52, fontSize: 15 }}>I already use With</button>
            </div>
            <div className="with-home-note">Private by default. No public feed. No leaderboards. Your goals stay yours.</div>
          </div>
          <PhoneFrame src={todayScreen} alt="With Today screen shown inside a phone" />
        </section>

        <section className="with-home-manifesto">
          <div className="with-home-manifesto-inner">
            <div className="with-home-manifesto-small">A different kind of health tracker</div>
            <p className="with-home-manifesto-copy">Health is personal. Support can be shared. <em>With keeps those two things from getting confused.</em></p>
          </div>
        </section>

        <section className="with-home-story">
          <div className="with-home-story-row">
            <div className="with-home-story-copy">
              <div className="with-home-rule" />
              <div className="with-home-kicker">Notice, don’t judge</div>
              <h2>See what’s changing over time.</h2>
              <p>A single day rarely tells the whole story. With helps you notice patterns, trends and small changes without turning every number into a verdict.</p>
              <p>The point isn’t a perfect streak. It’s better information about the life you’re actually living.</p>
            </div>
            <div className="with-home-screen-stage">
              <EditorialScreen src={trendsScreen} alt="With Trends screen showing a recent insight and weight trend" tilt={-2.2} label="Your trends" />
            </div>
          </div>

          <div className="with-home-story-row reverse" style={{ marginBottom: 0 }}>
            <div className="with-home-story-copy">
              <div className="with-home-rule" style={{ background: brand.sun }} />
              <div className="with-home-kicker">Your definition of progress</div>
              <h2>Your goals are yours.</h2>
              <p>Set what matters to you, whether that’s a number, a habit, a feeling or simply paying closer attention. Someone you’re With can be working toward something completely different.</p>
              <p>Sharing the experience never means sharing the same body, targets or definition of progress.</p>
            </div>
            <div className="with-home-screen-stage">
              <EditorialScreen src={goalsScreen} alt="With Goals screen showing a personal goal and progress" tilt={2.1} label="Your goals" />
            </div>
          </div>
        </section>

        <section className="with-home-solo">
          <div className="with-home-solo-inner">
            <div>
              <div className="with-home-kicker">Use it your way</div>
              <h2>Start with yourself. Add people only when it helps.</h2>
            </div>
            <div className="with-home-solo-grid">
              <div className="with-home-solo-card">
                <strong>On your own</strong>
                <p>Use With as your private place to track what matters. Nothing about the app requires you to bring someone else along.</p>
              </div>
              <div className="with-home-solo-card">
                <strong>With someone</strong>
                <p>Invite a partner, friend or family member when having someone in your corner would make the experience better.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="with-home-final">
          <div className="with-home-kicker">We’re in this together.</div>
          <h2>A little more attention. A little more support.</h2>
          <p>Start with your own health, your own goals and your own data. The rest can grow naturally from there.</p>
          <button type="button" onClick={onGetStarted} style={{ ...buttonStyle(true), minHeight: 52, padding: "0 28px", fontSize: 15 }}>Get started with With</button>
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
