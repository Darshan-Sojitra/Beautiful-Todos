import { createContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Create the authentication context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('authToken'));
    const [loading, setLoading] = useState(true);

    // Check if user is authenticated on mount and token changes
    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                } else {
                    // If token is invalid, clear it
                    setToken(null);
                    localStorage.removeItem('authToken');
                }
            } catch (error) {
                console.error('Auth verification error:', error);
            } finally {
                setLoading(false);
            }
        };

        verifyToken();
    }, [token]);

    // Function to handle token from URL after OAuth redirect
    useEffect(() => {
        const url = new URL(window.location.href);
        const tokenParam = url.searchParams.get('token');

        if (tokenParam) {
            // Save token to state and localStorage
            setToken(tokenParam);
            localStorage.setItem('authToken', tokenParam);

            // Remove token from URL to prevent leaks
            url.searchParams.delete('token');
            window.history.replaceState({}, document.title, url.pathname);
        }
    }, []);

    // Login function - redirects to Google OAuth
    const login = () => {
        window.location.href = import.meta.env.VITE_GOOGLE_AUTH_URL;
    };

    // Logout function
    const logout = async () => {
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            setToken(null);
            localStorage.removeItem('authToken');
        }
    };

    // Value object to be provided by the context
    const value = {
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired
};
