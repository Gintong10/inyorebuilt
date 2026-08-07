import { useEffect, useState } from "react";
import "./App.css";

const avatar = "/assets/images/inyo-avatar.png";
const storyPoster = "/assets/images/koC7fFLDZufp387TlpdZX3zMbo.png";
const storyWide = "/assets/images/fMUtkUufw0zHtBhT4P58gaYuMc.png";
const photoA = "/assets/images/RkNFujMumyuRX754PJGpG6H9Y.png";
const photoB = "/assets/images/RuIqGSg0BmQ17DMDgVzSrkI2TR4.jpg";
const photoC = "/assets/images/OlFZSnewiQ1iMrxq3xC3vANU6M.jpg";
const photoD = "/assets/images/QZ81ZZLvLCV6vXzWHiG6VwvFApE.jpeg";
const hena = "/assets/images/w41tk1wu8uoDpPSOPETnUdmzE.png";
const portrait = "/assets/images/GzY3hNyAkoepVB4uMJztgcusIg.png";
const logicVideo = "/assets/videos/re1Gtl1I6pTkJrlq1LGJGdIY.mp4";

function BrandMark() {
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    const LOCK_TOP = 48;
    let ticking = false;

    const isHomeSlide = () => {
      const hero = document.querySelector("header.hero");
      if (!hero) return window.scrollY < 8;
      const r = hero.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      return r.top > -vh * 0.35 && r.bottom > vh * 0.55;
    };

    const isSlideLocked = () => {
      if (isHomeSlide()) return false;
      const vh = window.innerHeight || 1;
      const slides = document.querySelectorAll("section.section");
      for (const el of slides) {
        const r = el.getBoundingClientRect();
        if (r.height < vh * 0.75) {
          const cover =
            Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / vh;
          if (cover >= 0.55 && r.top <= LOCK_TOP) return true;
          continue;
        }
        if (Math.abs(r.top) <= LOCK_TOP && r.bottom >= vh * 0.8) return true;
      }
      return false;
    };

    const update = () => setFaded(isSlideLocked());
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <a
      className={`brand-mark${faded ? " is-faded" : ""}`}
      href="#top"
      aria-label="Inyo"
    >
      <svg viewBox="0 0 40 18" fill="none" aria-hidden="true">
        <path
          d="M2 9C5 15 11 16 20 9C29 2 35 3 38 9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="2" cy="9" r="1.4" fill="currentColor" />
        <circle cx="38" cy="9" r="1.4" fill="currentColor" />
      </svg>
      <span>inyo</span>
    </a>
  );
}

function Phone({ messages }) {
  return (
    <div className="phone">
      <div className="phone-bar">
        <img src={avatar} alt="Inyo" className="phone-avatar" />
        <div>
          <div className="phone-name-row">
            <strong>Inyo</strong>
            <span className="online-dot" aria-hidden="true" />
          </div>
          <small>active now</small>
        </div>
      </div>
      <div className="chat">
        {messages.map((m) => (
          <div key={m.text} className={`bubble ${m.from}`}>
            {m.text}
          </div>
        ))}
      </div>
      <p className="composer">Message Inyo…</p>
    </div>
  );
}

const learnMessages = [
  {
    from: "inyo",
    text: "What’s something you’d never write on a dating profile, but wish people knew?",
  },
  {
    from: "user",
    text: "that i’d rather stay in and cook than do a loud bar",
  },
  {
    from: "inyo",
    text: "Noted! Quiet and intentional. That tells me a lot.",
  },
  {
    from: "inyo",
    text: "i have a good feeling about this one lmk if you want an intro",
  },
  { from: "user", text: "hmm, not quite my vibe this time" },
  { from: "inyo", text: "what was it about her that you didnt like?" },
];

const decideMessages = [
  { from: "inyo", text: "Hena!! i found another match, lmk what you think??" },
  { from: "user", text: "yes" },
  {
    from: "inyo",
    text: "do you want to know about their communication style, hobbies, values??",
  },
  { from: "user", text: "i’m interested in their values" },
  {
    from: "inyo",
    text: "so should i send them your profile? Just say yes or no",
  },
  { from: "user", text: "YES!" },
  { from: "inyo", text: "Good news! You both said yes 🎉" },
  {
    from: "inyo",
    text: "I found a quiet wine bar, Thursday at 7. Want me to book it?",
  },
  { from: "user", text: "yes!! please do" },
];

export default function App() {
  return (
    <div className="page" id="top">
      <div className="halftone" aria-hidden="true" />
      <BrandMark />

      <a className="story-card" href="#story">
        <img src={storyPoster} alt="Watch the story" />
        <span>Watch the story</span>
      </a>

      <div className="dock">
        <button type="button" onClick={() => (window.location.href = "#why")}>
          Why Inyo?
        </button>
        <button
          type="button"
          className="cta"
          onClick={() => window.open("sms:+1988", "_self")}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 6.5C4 5.12 5.12 4 6.5 4h11C18.88 4 20 5.12 20 6.5v7c0 1.38-1.12 2.5-2.5 2.5H9l-4 3v-3.5A2.5 2.5 0 0 1 4 13.5v-7Z"
              stroke="currentColor"
              strokeWidth="1.7"
            />
          </svg>
          Text Inyo
        </button>
      </div>

      <header className="hero">
        <div>
          <p className="eyebrow">
            Meet Inyo | Backed by{" "}
            <a href="https://www.gluckcollective.com" target="_blank" rel="noreferrer">
              Gluck Psychology
            </a>
          </p>
          <h1>
            Your personal matchmaker
            <br />
            inside imessage
          </h1>
        </div>
      </header>

      <section className="section problem" id="why">
        <div className="stack">
          <h2>Somewhere in this city is a person you&apos;re supposed to meet</h2>
          <h2>But endless swiping was never the fix. Feeling understood is.</h2>
          <div className="dot" aria-hidden="true" />
        </div>
      </section>

      <section className="section">
        <div className="section-inner split">
          <div className="copy">
            <h2>Inyo learns the real you.</h2>
            <p className="lead">
              Inyo picks up what you’d never put on a profile and what actually
              matters to you.
            </p>
            <span className="badge">Designed with science</span>
          </div>

          <div>
            <Phone messages={learnMessages} />
            <div className="photos">
              <img src={photoA} alt="Match profile photo" />
              <img src={photoB} alt="Match profile photo" />
              <img src={photoC} alt="Match profile photo" />
            </div>
          </div>

          <div className="copy right">
            <h2>Not a match? That’s useful too.</h2>
            <p className="lead">
              Pass on an intro and Inyo doesn’t forget. Every ‘no’ sharpens the
              next ‘yes’.
            </p>
            <span className="badge">Designed with real data</span>
          </div>
        </div>
      </section>

      <div className="logic-pin">
        <section className="section logic" id="story">
          <video className="logic-media" autoPlay muted loop playsInline poster={storyWide}>
            <source src={logicVideo} type="video/mp4" />
          </video>
          <div className="section-inner">
            <h2>A simple chat, over a complex web of logic.</h2>
            <p className="lead">
              Inyo runs multiple scoring models in parallel and adds guardrails to
              help you find the right match.
            </p>
          </div>
        </section>
      </div>

      <section className="section">
        <div className="section-inner split">
          <div className="copy">
            <h2>You decide who gets introduced.</h2>
            <p className="lead">
              Inyo asks before sharing your profile. Say yes when you’re
              interested, or pass without pressure.
            </p>
          </div>

          <Phone messages={decideMessages} />

          <div className="copy right">
            <h2>Go deeper before you say yes.</h2>
            <p className="lead">
              Ask about their values, habits, and communication style. Inyo only
              shares what it knows, so you can see beyond the profile.
            </p>
            <div className="photos" style={{ justifyContent: "flex-start" }}>
              <img src={photoC} alt="Match profile photo" />
              <img src={photoB} alt="Match profile photo" />
              <img src={photoD} alt="Match profile photo" />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner" style={{ maxWidth: 720, textAlign: "center" }}>
          <h2>A mutual yes, and the date’s set.</h2>
          <p className="lead" style={{ marginInline: "auto" }}>
            Inyo automatically books the spot, and hands you to a group chat,
            right up until you meet.
          </p>
        </div>
      </section>

      <section className="section mission">
        <div className="section-inner mission-grid">
          <div className="mission-card">
            <p className="label">Our Mission</p>
            <h2>We win when you find the real thing.</h2>
            <p className="lead">
              We’re creating this together with you, ensuring you feel seen and
              understood.
            </p>
            <div className="founder">
              <img src={hena} alt="Hena, co-founder of Inyo" />
              <div>Hena, Co-founder</div>
            </div>
          </div>
          <img className="portrait" src={portrait} alt="" />
        </div>

        <div className="section-inner footer">
          <div>
            <a href="/legal/terms-conditions">Terms &amp; Conditions</a>
            <a href="/legal/privacy-policy">Privacy Policy</a>
          </div>
          <div>© 2026 Inyo</div>
        </div>
      </section>
    </div>
  );
}
