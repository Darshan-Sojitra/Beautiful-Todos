import { useAuth } from '../context/useAuth';

export function UserProfile() {
    const { user, loading, login, logout, isAuthenticated } = useAuth();

    if (loading) {
        return <div className="user-profile loading">Loading...</div>;
    }

    if (!isAuthenticated) {
        return (
            <div className="user-profile">
                <button className="login-button" onClick={login}>
                    Log in with Google
                </button>
            </div>
        );
    }

    return (
        <div className="user-profile">
            <div className="user-info">

                <span className="user-name">Hi, {user?.displayName || 'User'}</span>
            </div>
            <button className="logout-button " onClick={logout}>
                Log out
            </button>
        </div>
    );
}
