import { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
user: User | null;
login: (email: string, password: string) => Promise<void>;
register: (name: string, email: string, password: string) => Promise<void>; logout: () => void;
isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
const [user, setUser] = useState<User | null>(null);

const login = async (email: string, password: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock successful login
    setUser({ id: '1', email, name: email.split('@')[0],
    });
};

const register = async (name: string, email: string, password: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock successful registration
    setUser({
    id: '1',
    email,
    name,
    });
};

const logout = () => {
    setUser(null);
};

return (
    <AuthContext.Provider
value={{
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
}}
    > {children}
    </AuthContext.Provider>
);
}

export function useAuth() {
const context = useContext(AuthContext);
if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
}
return context;
}
