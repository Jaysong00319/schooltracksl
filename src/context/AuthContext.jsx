import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('demo_user');
    const savedProfile = localStorage.getItem('demo_profile');

    if (savedUser && savedProfile) {
      setUser(JSON.parse(savedUser));
      setProfile(JSON.parse(savedProfile));
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (localStorage.getItem('demo_user')) return;

      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId, email) => {
    try {
      const { data, error } = await supabase
        .from('teacher')
        .select('*')
        .eq('Email', email)
        .single();
      
      if (!error && data) {
        setProfile(data);
      } else {
        setProfile({
          Teacher_ID: 'T-101',
          First_Name: 'Abu',
          Last_Name: 'Koroma',
          System_Role: 'Principal',
          school_id: 'SCH-001',
          class_assigned: 'Form 3C'
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();

    // Baseline presentation accounts
    if (cleanEmail === "principal@school.gov.sl" && password === "freetown2026") {
      const mockUser = { id: 'mock-principal-id', email: cleanEmail };
      const mockProfile = {
        Teacher_ID: 'T-101',
        First_Name: 'Abu',
        Last_Name: 'Koroma',
        System_Role: 'Principal',
        school_id: 'SCH-001',
        class_assigned: 'Form 3C'
      };
      
      localStorage.setItem('demo_user', JSON.stringify(mockUser));
      localStorage.setItem('demo_profile', JSON.stringify(mockProfile));
      
      setUser(mockUser);
      setProfile(mockProfile);
      setLoading(false);
      return { data: { user: mockUser }, error: null };
    }

    if (cleanEmail === "teacher@school.gov.sl" && password === "freetown2026") {
      const mockUser = { id: 'mock-teacher-id', email: cleanEmail };
      const mockProfile = {
        Teacher_ID: 'T-102',
        First_Name: 'Fatu',
        Last_Name: 'Kamara',
        System_Role: 'Teacher',
        school_id: 'SCH-001',
        class_assigned: 'Form 3C'
      };

      localStorage.setItem('demo_user', JSON.stringify(mockUser));
      localStorage.setItem('demo_profile', JSON.stringify(mockProfile));

      setUser(mockUser);
      setProfile(mockProfile);
      setLoading(false);
      return { data: { user: mockUser }, error: null };
    }

    if (cleanEmail === "parent@school.gov.sl" && password === "freetown2026") {
      const mockUser = { id: 'mock-parent-id', email: cleanEmail };
      const mockProfile = {
        Teacher_ID: 'P-101',
        First_Name: 'Mariatu',
        Last_Name: 'Turay',
        System_Role: 'Parent',
        school_id: 'SCH-001',
        child_id: '502'
      };

      localStorage.setItem('demo_user', JSON.stringify(mockUser));
      localStorage.setItem('demo_profile', JSON.stringify(mockProfile));

      setUser(mockUser);
      setProfile(mockProfile);
      setLoading(false);
      return { data: { user: mockUser }, error: null };
    }

    // Recover registered custom accounts from local storage
    const customUser = localStorage.getItem(`demo_user_${cleanEmail}`);
    const customProfile = localStorage.getItem(`demo_profile_${cleanEmail}`);

    if (customUser && customProfile) {
      setUser(JSON.parse(customUser));
      setProfile(JSON.parse(customProfile));
      localStorage.setItem('demo_user', customUser);
      localStorage.setItem('demo_profile', customProfile);
      setLoading(false);
      return { data: { user: JSON.parse(customUser) }, error: null };
    }

    // Real database sign-in
    return await supabase.auth.signInWithPassword({ email: cleanEmail, password });
  };

  const logout = async () => {
    localStorage.removeItem('demo_user');
    localStorage.removeItem('demo_profile');
    setUser(null);
    setProfile(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);