import { Link } from 'react-router-dom';
import TaruLogo from '../components/TaruLogo';
import './landing.css';

const tools = [
  { title: 'Mood history', description: 'Log how you feel and look back at how your mood changes over time.' },
  { title: 'Peer chat', description: 'Talk with other students when you want someone to listen.' },
  { title: 'Taru AI chat', description: 'Put what’s on your mind into words in a conversation with the AI assistant.' },
  { title: 'Games', description: 'Take a break with a game on your own or with a friend.' },
];

export default function LandingPage() {
  return (
    <div className="student-app taru-landing">
      <header className="landing-header landing-width">
        <Link to="/" className="landing-brand">
          <TaruLogo size={34} />
          <span>taru</span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#student-tools">Student tools</a>
          <Link to="/auth">Sign in</Link>
        </nav>
      </header>

      <main className="landing-width">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div>
            <h1 id="landing-title">Mental health check-ins for college students</h1>
            <p className="landing-intro">Take a moment between classes or at the end of the day to notice how you’re doing and what’s weighing on you.</p>
          </div>

          <div className="landing-checkin">
            <h2>How are you feeling today?</h2>
            <p>Reflect on your mood, energy, stress and motivation.</p>
            <Link className="landing-button" to="/check">Start a check-in</Link>
            <p className="landing-checkin-note">No account needed</p>
          </div>
        </section>

        <section id="student-tools" className="landing-tools" aria-labelledby="tools-title">
          <div className="landing-tools-intro">
            <h2 id="tools-title">Inside your Taru account</h2>
            <Link className="landing-button landing-button-dark" to="/auth" state={{ tab: 'register' }}>
              Create an account
            </Link>
          </div>

          <dl className="landing-directory">
            {tools.map(({ title, description }) => (
              <div key={title}>
                <dt className="font-display">{title}</dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="landing-footer landing-width">
        Taru · Cogniease Techno Labs Pvt. Ltd.
      </footer>
    </div>
  );
}
