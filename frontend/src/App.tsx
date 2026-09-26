import { useEffect, useState } from 'react';
import Auth from './Auth';
import Dashboard from './Dashboard';
import { AuthUser, getToken, clearToken, me } from './api';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On load, if a token exists, validate it and restore the session.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  function onLogout() {
    clearToken();
    setUser(null);
  }

  if (loading) return <div className="container">Loading…</div>;
  if (!user) return <Auth onAuthed={setUser} />;
  return <Dashboard user={user} onLogout={onLogout} />;
}
