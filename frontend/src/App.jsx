import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { CreateTodo } from './components/CreateTodo'
import { Todos } from './components/Todos'
import { AuthProvider } from './context/AuthContext'
import { UserProfile } from './components/UserProfile'
import { useAuth } from './context/useAuth'

// HomePage component that redirects to /todos if authenticated
function HomePage() {
  const { isAuthenticated } = useAuth();

  // Check for token in URL (for OAuth redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      // Store token in localStorage
      localStorage.setItem('authToken', token);
      // Clean URL by removing the token
      window.history.replaceState({}, document.title, window.location.pathname);
      // Reload the page to apply the token
      window.location.reload();
    }
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/todos" />;
  }

  return (
    <div className="welcome-container">
      <h2>Welcome to Todo App</h2>
      <p>Please log in to see your todos</p>

    </div>
  );
}

// Create a container component for content that requires authentication
function TodoContent() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setTodos([]);
      setLoading(false);
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL}/todos`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(async function (res) {
        if (!res.ok) {
          console.error(`Error fetching todos: ${res.status} ${res.statusText}`);
          if (res.status === 401) {
            // Handle unauthorized - token might be invalid
            throw new Error('Unauthorized - please log in again');
          }
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        const json = await res.json();
        console.log("Todos fetched successfully:", json);
        setTodos(Array.isArray(json.todos) ? json.todos : []);
      })
      .catch(error => {
        console.error("Failed to fetch todos:", error);
        // If unauthorized, clear token
        if (error.message.includes('Unauthorized')) {
          localStorage.removeItem('authToken');
          window.location.href = '/';
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAuthenticated, token]);

  const addTodo = (newTodo) => {
    console.log("Adding new todo to App state:", newTodo);
    setTodos(prevTodos => [...prevTodos, newTodo]);
  };

  // New function to handle todo updates from the Todos component
  const updateTodo = (updatedTodo) => {
    setTodos(prevTodos =>
      prevTodos.map(todo =>
        todo._id === updatedTodo._id ? updatedTodo : todo
      )
    );
  };

  // New function to handle todo deletion
  const deleteTodo = (todoId) => {
    setTodos(prevTodos => prevTodos.filter(todo => todo._id !== todoId));
  };

  if (!isAuthenticated) {
    return (
      <div className="not-authenticated">
        <h2>Please log in to see your todos</h2>
      </div>
    );
  }

  return (
    <>
      {loading ? (
        <div className="loader">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          <CreateTodo addTodo={addTodo} />
          <Todos todos={todos} onUpdate={updateTodo} onDelete={deleteTodo} />
        </>
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          {/* Decorative elements */}
          <div className="decorative-circle circle-1"></div>
          <div className="decorative-circle circle-2"></div>

          <div className="card">
            <div className="app-header">
              <h1 className="app-title">✨ Todo App</h1>
              <UserProfile />
            </div>

            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/todos" element={<TodoContent />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
