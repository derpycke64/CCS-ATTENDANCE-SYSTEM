'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabase";
import { getDistanceInMeters } from "../../utils/geo";
import "./logincss.css";
import Image from 'next/image';

interface Eventstuff{
    id:string;
    title:string;
    description:string;
    latitude:number;
    longitude:number;
    radius_meters:number;
}


export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errormessage, setErrorMessage] = useState('');

    const [studentid, setStudentId] = useState('');
    const [studentname, setStudentName] = useState('');
    const [gpsVerified, setGpsVerified] = useState(false);
    const [loadingGps, setLoadingGps] = useState(true);
    const [gpsStatus, setGpsStatus] = useState("Locating ...");
    const [targetevent, setTargetEvent] = useState<Eventstuff | null>(null);
    const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
    
    const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
    const [resetEmail, setResetEmail] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [formView, setFormView] = useState<'login' | 'forgot' | 'update'>('login');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [isLoading, setIsLoading] = useState(false);


    const [activeSide, setActiveSide] = useState<'left' | 'right' | null>(null);
    const gpsBannerStyle = {
        ['--banner-bg' as any]: loadingGps ? '#f3f4f6' : gpsVerified ? '#ecfdf5' : '#fef2f2',
        ['--banner-text' as any]: loadingGps ? '#4b5563' : gpsVerified ? '#065f46' : '#991b1b',
        ['--banner-border' as any]: loadingGps ? '#e5e7eb' : gpsVerified ? '#a7f3d0' : '#fee2e2',
    } as React.CSSProperties;

    const handlelogin = async (evnt: React.SubmitEvent<HTMLFormElement>) => {
        evnt.preventDefault();
        setErrorMessage('');

        const cleanEmail = email.toLocaleLowerCase().trim();

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: password,
        });

        if (authError || !authData.user) {
            return setErrorMessage('Invalid email or password');
        }

        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (profileError || !profileData) {
            await supabase.auth.signOut();
            return setErrorMessage('No staff profile found for this account.');
        }

        await supabase.from('staff_logs').insert([{
            username: profileData.username,
            session_role: profileData.role,
            logged_in_at: new Date().toISOString()
        }]);

        router.push('/admin');
    }
    
    const handleStudentCheckIn = async (evnt: React.SubmitEvent<HTMLFormElement>) => {
        evnt.preventDefault();
       
        if (!studentid || !studentname) {
            return alert('Please fill in required fields');
        }
         if (studentid.toString().length !== 11) {
            window.alert("Validation Error: Your Student ID must be exactly 11 digits long (e.g., 01251111111). Please check your entry and try again.");
            return;
        }
        if (!gpsVerified || !targetevent) {
            return alert('You are not within the event range or no active event found');
        }
        const activeEventId = targetevent.id;
        const { error: checkInError } = await supabase
            .from('attendance')
            .insert([
            {
                studentid: parseInt(studentid) || 0,
                studentname: studentname,
                eventid: activeEventId,
                timestamp: new Date().toISOString(),
                verified_distance_meters: calculatedDistance || 0
            }
            ]);

        if (checkInError) {
            if (checkInError.code === '23505') {
                alert('You have already checked in for this event.');
            } else {
                alert(`Error checking in: ${checkInError.message}`);
            }
        } else {
            alert('successfully checked in');
            setStudentId('');
            setStudentName('');
        }
    };
    const handleRequestReset = async (e: React.SubmitEvent  <HTMLFormElement>) => {
        e.preventDefault();
        setSuccessMessage('');
        
    
        const redirectToUrl = `${window.location.origin}/reset-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
            redirectTo: redirectToUrl, 
        });

        if (error) {
            alert(`Reset Request Failure: ${error.message}`);
        } else {
            setSuccessMessage("Check your email! A password reset link has been dispatched to your inbox.");
            setResetEmail('');
        }
    };
    const handleUpdatePassword = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return alert("Validation Error: Passwords do not match.");
        }
        
        setIsLoading(true);
        
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) {
            alert(`Error updating credentials: ${error.message}`);
        } else {
            alert("Password updated successfully! Redirecting back to sign in panel...");
            setNewPassword('');
            setConfirmPassword('');
            setFormView('login');
        }
        setIsLoading(false);
        };
    useEffect(() => {
        document.title = "Login | Attendance System"; 
    }, []);

    useEffect(() => {
        async function evaluateStudentRange() {
            setLoadingGps(true);
            if (!navigator.geolocation) {
                setGpsStatus("Geolocation is not supported by your browser");
                setLoadingGps(false);
                return;
            }
            const {data: latestEvent, error } = await supabase
                .from('events')
                .select('*')
                .eq('is_active', true)
                .single();

            if(error || !latestEvent) {
                setGpsStatus("No active events found");
                setLoadingGps(false);
                return;
            }
        setTargetEvent(latestEvent); 
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const distanceApart = getDistanceInMeters(
                    position.coords.latitude,
                    position.coords.longitude,
                    latestEvent.latitude,
                    latestEvent.longitude
                );
                setCalculatedDistance(distanceApart);
                if (distanceApart <= latestEvent.radius_meters) {
                    setGpsVerified(true);
                    setGpsStatus(`Active Event: ${latestEvent.title} | Location: you are in range.`);
                    setLoadingGps(false);
                } else {
                    setGpsVerified(false);
                    setGpsStatus(`Active Event: ${latestEvent.title} | Location: Denied! You are ${Math.round(distanceApart - latestEvent.radius_meters)}m outside the area.`);
                    setLoadingGps(false);
                }
            }
            ,() => {
                setGpsStatus("Unable to retrieve your location || Check your browser settings and allow location access.");
                setLoadingGps(false);
            }, {enableHighAccuracy:true}
        );
        }
        evaluateStudentRange();
    }, []);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
            setFormView('update');
            }
    });

    return () => {
        subscription.unsubscribe();
    };
    }, []);

    

return (
    <div className={`login-viewport ${activeSide === 'left' ? 'expand-left' : activeSide === 'right' ? 'expand-right' : ''}`}>
        <div className="split-panel panel-left" onClick={() => setActiveSide('left')} />
        <div className="split-panel panel-right" onClick={() => setActiveSide('right')} />

        <header className="portal-main-header">
            OUR LADY OF FATIMA UNIVERSITY
            <img src="/OLFU_official_logo.png" alt="Olfu Logo" className="portal-center-logo" />
        </header>

        {activeSide && (
            <button className="split-reset-btn" onClick={() => setActiveSide(null)}>← Back</button>
        )}
        
      
        <div className="login-content-flex-container">
            <div className="content-col content-col-left">
                <h2 className="side-label">Student Login</h2>
                <h2 className="card-section-title">Check in attendance</h2>
                <div className='student-card'>
                   <div className="login-header">
                        <h1 className="login-title">Check in</h1>
                        <p className="login-subtitle">This will be your attendance.</p>
                    </div>
                    <form onSubmit={handleStudentCheckIn} className="input-form" onFocus={() => setActiveSide('left')}>
                        <div className="form-group">
                            <label className="form-label">Student ID</label>
                            <input type="text" inputMode="numeric"maxLength={11} required placeholder="Enter Student ID" className="login-input" value={studentid || ''} 
                                onChange={(e) => {
                                    const cleanVal = e.target.value.replace(/\D/g, '');
                                    setStudentId(cleanVal);
                                }}/>
                        </div>
                        <div className="form-group">
                            <label className='form-label'>Enter your name</label>
                            <input type="text" required placeholder="Enter your name" className="login-input" value={studentname || ''} onChange={(e) => setStudentName(e.target.value)}/>
                        </div>
                        <button type="submit" className="login-submit-button" style={{ opacity: gpsVerified ? 1 : 0.5 }} disabled={!gpsVerified}> Check In </button> 
                    </form>
                </div>
                <div className="gps-status-banner" style={gpsBannerStyle}>
                    {gpsStatus}
                </div>
            </div>

           <div className="content-col content-col-right">
                <h2 className="side-label">Staff Portal</h2>
                <h2 className="card-section-title">Log in as staff/admin</h2>
                <div className="login-card">
                    
                    {formView === 'login' && (
                        <>
                            <div className="login-header">
                                <h1 className="login-title">Log in</h1>
                                <p className="login-subtitle">Sign in</p>
                            </div>
                            {errormessage && <div className="error-banner">{errormessage}</div>}
                            
                            <form onSubmit={handlelogin} className="input-form" onFocus={() => setActiveSide('right')}>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input type="email" required placeholder="Enter your email" className="login-input" value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Password</label>
                                    <div className="password-input-wrapper">
                                        <input type={showLoginPassword ? "text" : "password"} required placeholder="••••••••" className="login-input password-field-override" value={password} onChange={(e) => setPassword(e.target.value)}/>
                                        <button type="button" className="password-toggle-btn" onClick={() => setShowLoginPassword(!showLoginPassword)}>
                                            {showLoginPassword ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                                    <button type="button" className="forgot-password-link" onClick={() => setFormView('forgot')}>
                                        Forgot Password?
                                    </button>
                                </div>

                                <button type="submit" className="login-submit-button">Authenticate Access</button>
                            </form>
                        </>
                    )}

                    {formView === 'forgot' && (
                        <>
                            <div className="login-header">
                                <h1 className="login-title">Reset Password</h1>
                                <p className="login-subtitle">Enter your email to receive a recovery link</p>
                            </div>
                            {successMessage && <div className="success-banner" style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>{successMessage}</div>}
                            
                            <form onSubmit={handleRequestReset} className="input-form">
                                <div className="form-group">
                                    <label className="form-label">Account Email Address</label>
                                    <input type="email" required placeholder="username@olfu.edu.ph" className="login-input" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                                </div>

                                <button type="submit" className="login-submit-button">Send Recovery Link</button>

                                <div className="back-to-signin-wrapper">
                                    <button type="button" className="forgot-password-link" onClick={() => setFormView('login')}>
                                        ← Back to Standard Sign In
                                    </button>
                                </div>
                            </form>
                        </>
                    )}

                    {formView === 'update' && (
                        <>
                            <div className="login-header">
                                <h1 className="login-title" style={{ color: '#8c1d1d' }}>Update Password</h1>
                                <p className="login-subtitle">Configure your new system operator credentials</p>
                            </div>
                            
                            <form onSubmit={handleUpdatePassword} className="input-form">
                                <div className="settings-field-group">
                                    <label className="reset-field-label">New Password</label>
                                    <div className="password-input-wrapper">
                                        <input type={showPass ? "text" : "password"} required className="form-input password-field-override" placeholder="Minimum 6 characters"value={newPassword}onChange={(e) => setNewPassword(e.target.value)}/>
                                        <button type="button" className="password-toggle-btn" onClick={() => setShowPass(!showPass)}>
                                            {showPass ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                </div>

                                <div className="settings-field-group" style={{ marginTop: '16px' }}>
                                    <label className="reset-field-label">Confirm New Password</label>
                                    <div className="password-input-wrapper">
                                        <input type={showConfirmPass ? "text" : "password"} required className="form-input password-field-override" placeholder="Re-type your password"value={confirmPassword}onChange={(e) => setConfirmPassword(e.target.value)}/>
                                        <button type="button" className="password-toggle-btn" onClick={() => setShowConfirmPass(!showConfirmPass)}>
                                            {showConfirmPass ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" className="login-submit-button reset-submit-btn-override" disabled={isLoading}>
                                    {isLoading ? 'Updating Database...' : 'Update Password'}
                                </button>
                            </form>
                        </>
                    )}

                </div>
            </div>

        </div>
    </div>
);
}


                        