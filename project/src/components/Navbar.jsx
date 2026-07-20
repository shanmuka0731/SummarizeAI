import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="navbar">
      <h2>Summarize AI</h2>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/brain">Brain</Link>
        <Link to="/text">Text</Link>
        <Link to="/pdf">PDF</Link>
        <Link to="/youtube">YouTube</Link>

      </div>
    </nav>
  );
}