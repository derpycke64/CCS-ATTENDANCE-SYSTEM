'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabase";
import { getDistanceInMeters } from "../../utils/geo";
import "./logincss.css";
import { auth } from '@/lib/firebase'; 
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';

interface Eventstuff {
    id: string;
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
    location?: string;
}

type IconProps = { className?: string };

const svgBase = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
};

const MailIcon = ({ className }: IconProps) => (
    <svg {...svgBase} className={className}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
);
const LockIcon = ({ className }: IconProps) => (
    <svg {...svgBase} className={className}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
);
const EyeIcon = ({ className }: IconProps) => (
    <svg {...svgBase} className={className}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
const EyeOffIcon = ({ className }: IconProps) => (
    <svg {...svgBase} className={className}><path d="M17.9 17.9A10.1 10.1 0 0 1 12 19c-6.5 0-10-7-10-7a17.7 17.7 0 0 1 4.1-5" /><path d="M9.9 5.2A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.2 3.2" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /><path d="m2 2 20 20" /></svg>
);
const ArrowRightIcon = ({ className }: IconProps) => (
    <svg {...svgBase} className={className}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
);
const ArrowLeftIcon = ({ className }: IconProps) => (
    <svg {...svgBase} className={className}><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></svg>
);
const UserIcon = ({ className }: IconProps) => (
    <svg {...svgBase} className={className}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
const DocIcon = ({ className }: IconProps) => (
    <svg {...svgBase} className={className}><path d="M6 3h9l4 4v14H6z" /><path d="M9 12h7M9 16h7M9 8h3" /></svg>
);
const ShieldIcon = ({ className }: IconProps) => (
    <svg {...svgBase} className={className}><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" /></svg>
);
const CapIcon = ({ className }: IconProps) => (
    <svg {...svgBase} className={className}><path d="m2 9 10-5 10 5-10 5z" /><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5" /></svg>
);
const CalendarIcon = ({ className }: IconProps) => (
    <svg {...svgBase} className={className}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
);
const PinIcon = ({ className }: IconProps) => (
    <svg {...svgBase} className={className}><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>
);

type Feature = { Icon: (p: IconProps) => React.ReactElement; label: string };

const STAFF_FEATURES: Feature[] = [
    { Icon: UserIcon, label: 'Manage Your Profile' },
    { Icon: DocIcon, label: 'Access Resources' },
    { Icon: ShieldIcon, label: 'Secure & Reliable' },
    { Icon: CapIcon, label: 'For a Better Tomorrow' },
];

const STUDENT_FEATURES: Feature[] = [
    { Icon: UserIcon, label: 'Verify Your Identity' },
    { Icon: CalendarIcon, label: 'Pick Your Event' },
    { Icon: PinIcon, label: 'Location Verified' },
    { Icon: ShieldIcon, label: 'Secure & Reliable' },
];

function PortalHero({ accent, description, features }: { accent: string; description: string; features: Feature[] }) {
    return (
        <section className="portal-hero">
            <p className="hero-eyebrow">Welcome to</p>
            <h1 className="hero-title">Olfu <span>{accent}</span></h1>
            <p className="hero-desc">{description}</p>
            <div className="hero-divider" />
            <ul className="hero-features">
                {features.map(({ Icon, label }) => (
                    <li key={label} className="hero-feature">
                        <span className="hero-feature-icon"><Icon /></span>
                        <span>{label}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errormessage, setErrorMessage] = useState('');

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

    const [attendanceType, setAttendanceType] = useState<'Check In' | 'Check Out'>('Check In'); 
    const [selectedEventId, setSelectedEventId] = useState<string>(''); 
    const [completedEventIds, setCompletedEventIds] = useState<string[]>([]);
    const [availableEvents, setAvailableEvents] = useState<Eventstuff[]>([]); 
    const [studentUser, setStudentUser] = useState<any>(null);

    const [activeSide, setActiveSide] = useState<'left' | 'right' | null>(null);
    const gpsBannerStyle = {
        ['--banner-bg' as any]: loadingGps ? '#f3f4f6' : gpsVerified ? '#ecfdf5' : '#fef2f2',
        ['--banner-text' as any]: loadingGps ? '#4b5563' : gpsVerified ? '#065f46' : '#991b1b',
        ['--banner-border' as any]: loadingGps ? '#e5e7eb' : gpsVerified ? '#a7f3d0' : '#fee2e2',
    } as React.CSSProperties;

    const handlelogin = async (evnt: React.FormEvent<HTMLFormElement>) => {
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
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const emailStr = user.email || '';

                const isValidDomain = 
                    emailStr.endsWith('@olfu.edu.ph') || 
                    emailStr.endsWith('@fatima.edu.ph') ||
                    emailStr.endsWith('@student.fatima.edu.ph');

                if (isValidDomain) {
                    setStudentUser(user);
                    if (user.displayName) {
                        setStudentName(user.displayName);
                    }
                } else {
                    await firebaseSignOut(auth);
                    setStudentUser(null);
                    alert("Access Denied: You must sign in using your official OLFU student workspace account.");
                }
            } else {
                setStudentUser(null);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleStudentCheckIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!studentUser || !selectedEventId) return;

        try {
            if (attendanceType === 'Check In') {
                const { data: existingRecord, error: checkError } = await supabase
                    .from('attendance')
                    .select('checked_in_at')
                    .eq('student_email', studentUser.email)
                    .eq('eventid', selectedEventId)
                    .maybeSingle();

                if (checkError) throw checkError;

                if (existingRecord && existingRecord.checked_in_at) {
                    alert("You have already checked in for this event! Please select 'Check Out' if you are leaving.");
                    return; 
                }
            } else {
                const { data: existingRecord, error: checkError } = await supabase
                    .from('attendance')
                    .select('checked_in_at, checked_out_at')
                    .eq('student_email', studentUser.email)
                    .eq('eventid', selectedEventId)
                    .maybeSingle();

                if (checkError) throw checkError;

                if (!existingRecord || !existingRecord.checked_in_at) {
                    alert("You haven't checked in for this event yet! Please Check In first.");
                    return;
                }
                if (existingRecord.checked_out_at) {
                    alert("You have already checked out of this event.");
                    return;
                }
            }

            const isCheckingIn = attendanceType === 'Check In';
            const currentClockTime = new Date().toISOString();

            const payload: any = {
                eventid: selectedEventId,
                studentname: studentUser.displayName || studentname,
                student_email: studentUser.email,
                log_type: attendanceType, 
                timestamp: currentClockTime,
                verified_distance_meters: calculatedDistance !== null ? calculatedDistance : 0
            };

            if (isCheckingIn) {
                payload.checked_in_at = currentClockTime;
            } else {
                payload.checked_out_at = currentClockTime;
            }

            const { error: dbError } = await supabase
                .from('attendance')
                .upsert(payload, { 
                    onConflict: 'student_email,eventid' 
                });

            if (dbError) throw dbError;

            alert(`✓ ${attendanceType} logged successfully!`);

            if (attendanceType === 'Check Out') {
                setCompletedEventIds((prev) => [...prev, selectedEventId]);
                setSelectedEventId('');
                await signOut(auth); 
                setStudentUser(null);
            }
        } catch (error: any) {
            console.error("Database validation error:", error);
            alert(`Sync failed: ${error.message}`);
        }
    };

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
                
            const emailStr = user.email || '';
            const isValidDomain = 
                emailStr.endsWith('@olfu.edu.ph') || 
                emailStr.endsWith('@fatima.edu.ph') ||
                emailStr.endsWith('@student.fatima.edu.ph');

            if (!isValidDomain) {
                await signOut(auth);
                alert("You must sign in using your official workspace account.");
                setStudentUser(null);
                return;
            }

            setStudentUser(user);
            if (user.displayName) {
                setStudentName(user.displayName);
            }
            
            alert(`Logged in successfully: Welcome back, ${user.displayName}!`);
        } catch (error) {
            console.error("Google Auth Modal Exception:", error);
            alert("Identity verification check cancelled or connection timed out.");
        }
    };

    const handleRequestReset = async (e: React.FormEvent<HTMLFormElement>) => {
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

    const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
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
        const fetchLiveEvents = async () => {
            try {
                const { data, error } = await supabase
                    .from('events')
                    .select('*')
                    .eq('is_active', true);

                if (error) throw error;
                if (data) setAvailableEvents(data);
            } catch (err) {
                console.error("Error fetching live admin events:", err);
            }
        };
        fetchLiveEvents();
    }, []);
    
    useEffect(() => {
        if (!selectedEventId) {
            setGpsStatus("Please select a campus event to verify your location range.");
            setGpsVerified(false);
            setLoadingGps(false);
            return;
        }

        if (!navigator.geolocation) {
            setGpsStatus("Geolocation is not supported by your browser.");
            setLoadingGps(false);
            return;
        }

        const chosenEvent = availableEvents.find((ev) => ev.id === selectedEventId);
        if (!chosenEvent) {
            setGpsStatus("Loading event coordinates...");
            setGpsVerified(false);
            setLoadingGps(true);
            return;
        }

        setTargetEvent(chosenEvent);
        setLoadingGps(true);
        setGpsStatus("Acquiring high-accuracy GPS lock...");

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;

                const distanceApart = getDistanceInMeters(
                    latitude,
                    longitude,
                    Number(chosenEvent.latitude),
                    Number(chosenEvent.longitude)
                );

                setCalculatedDistance(distanceApart);
                setLoadingGps(false);

                // Account for GPS accuracy buffer (capped at 50m so bad Wi-Fi fixes don't bypass geofence)
                const effectiveDistance = Math.max(0, distanceApart - Math.min(accuracy, 50));
                const weakSignalHint = accuracy > 100
                    ? " Weak GPS signal (Wi-Fi/IP detected)—switch to a phone with mobile data/GPS."
                    : "";

                if (effectiveDistance <= chosenEvent.radius_meters) {
                    setGpsVerified(true);
                    setGpsStatus(
                        `Active Event: ${chosenEvent.title} | In range (${Math.round(distanceApart)}m away, ±${Math.round(accuracy)}m accuracy).`
                    );
                } else {
                    setGpsVerified(false);
                    setGpsStatus(
                        `Active Event: ${chosenEvent.title} | Denied! ${Math.round(distanceApart - chosenEvent.radius_meters)}m out of range (±${Math.round(accuracy)}m GPS accuracy).${weakSignalHint}`
                    );
                }
            },
            (error) => {
                setLoadingGps(false);
                setGpsVerified(false);
                setGpsStatus(`Location error (${error.message}). Enable GPS/Location permissions.`);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 15000,
            }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [selectedEventId, availableEvents]);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
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
            <div className="bg-image" />
            <div className="bg-overlay" />
            <svg className="bg-curves" viewBox="0 0 1686 933" preserveAspectRatio="xMinYMax slice" aria-hidden="true">
                <path d="M0 690 C 60 790 260 880 560 933 L 0 933 Z" fill="rgba(140,40,60,0.18)" />
                <path d="M0 690 C 60 790 260 880 560 933" fill="none" stroke="rgba(214,110,130,0.55)" strokeWidth="1.5" />
                <path d="M0 765 C 90 850 280 905 470 933" fill="none" stroke="rgba(214,110,130,0.25)" strokeWidth="1" />
                <path d="M880 933 C 1100 885 1400 850 1686 868" fill="none" stroke="rgba(214,110,130,0.35)" strokeWidth="1.2" />
            </svg>

            <div className="split-panel panel-left" onClick={() => setActiveSide('left')} />
            <div className="split-panel panel-right" onClick={() => setActiveSide('right')} />

            <header className="portal-main-header">
                <img src="/OLFU_official_logo.png" alt="Olfu Logo" className="portal-center-logo" />
                <div>
                    <span className="portal-header-title">OUR LADY OF FATIMA UNIVERSITY</span>
                    <span className="portal-header-sub">
                        {activeSide === 'left' ? 'Student Portal' : activeSide === 'right' ? 'Staff Portal' : 'Attendance Portal'}
                    </span>
                </div>
            </header>

            {activeSide && (
                <button className="split-reset-btn" onClick={() => setActiveSide(null)}>
                    <ArrowLeftIcon /> Back
                </button>
            )}
            
            <div className="login-content-flex-container">
                <div className="content-col content-col-left">
                    <div className="col-inner">
                        <PortalHero
                            accent="Student Portal"
                            description="Sign in with your school account to log your attendance at campus events."
                            features={STUDENT_FEATURES}
                        />
                        <div className="card-stack">
                            <h2 className="side-label">Student Login</h2>
                            <h2 className="card-section-title">Check in attendance</h2>
                            <div className="student-card">
                                <img src="/OLFU_official_logo.png" alt="OLFU seal" className="card-logo" />
                                <div className="login-header">
                                    <h1 className="login-title">Check in</h1>
                                    <p className="login-subtitle">Student Attendance</p>
                                </div>

                                {!studentUser ? (
                                    <div className="google-auth-container">
                                        <p className="google-auth-prompt-text">
                                            Sign in with your institutional account to verify your identity.
                                        </p>
                                        <button 
                                            type="button" 
                                            onClick={handleGoogleSignIn} 
                                            className="login-submit-button google-sign-in-btn"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 18 18">
                                                <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8c-.2 1.1-.8 2-1.8 2.6v2.2h2.9c1.7-1.6 2.7-4 2.7-6.6z"/>
                                                <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3C2.4 16 5.5 18 9 18z"/>
                                                <path fill="#FBBC05" d="M3.9 10.7c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7V5H.9C.3 6.2 0 7.6 0 9s.3 2.8.9 4l3-2.3z"/>
                                                <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6C13.4 1 11.4 0 9 0 5.5 0 2.4 2 1 5.1l3 2.3c.7-2.2 2.7-3.8 9-3.6z"/>
                                            </svg>
                                            Sign In with OLFU Google Account
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleStudentCheckIn} className="input-form" onFocus={() => setActiveSide('left')}>
                                        <div className="verified-profile-badge">
                                            Successfully logged in using: <br/>
                                            <span className="verified-profile-email">{studentUser.email}</span>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Verified Student Email</label>
                                            <div className="input-icon-wrap">
                                                <MailIcon className="input-icon" />
                                                <input type="email" disabled className="login-input is-readonly" value={studentUser.email || ''} />
                                            </div>
                                            <span className="helper-text">
                                                Identity securely logged via active Google Session credentials.
                                            </span>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Select Active Event</label>
                                            <select required className="login-input event-selector-select" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
                                                <option value="" disabled>-- Choose an ongoing event --</option>
                                                {availableEvents
                                                    .filter(event => !completedEventIds.includes(event.id))
                                                    .map(event => (
                                                        <option key={event.id} value={event.id}>
                                                            {event.title}
                                                        </option>
                                                    ))
                                                }
                                            </select>
                                        </div>

                                        <div className="form-group attendance-toggle-row">
                                            <label className="attendance-toggle-label">
                                                <input type="radio" name="logType" value="Check In" checked={attendanceType === 'Check In'} onChange={() => setAttendanceType('Check In')} className="attendance-toggle-radio"/> 
                                                Check In
                                            </label>
                                            <label className="attendance-toggle-label">
                                                <input type="radio" name="logType" value="Check Out" checked={attendanceType === 'Check Out'} onChange={() => setAttendanceType('Check Out')} className="attendance-toggle-radio"/> 
                                                Check Out
                                            </label>
                                        </div>

                                        <div className="gps-status-banner" style={gpsBannerStyle}>
                                            {gpsStatus}
                                        </div>

                                        <button type="submit" className="login-submit-button" style={{ opacity: gpsVerified ? 1 : 0.5 }} disabled={!gpsVerified}>
                                            Submit {attendanceType === 'Check In' ? 'Check-In' : 'Check-Out'} Log
                                            <ArrowRightIcon />
                                        </button> 

                                        <div className="logout-btn-container">
                                            <button 
                                                type="button" 
                                                className="student-logout-button" 
                                                onClick={async () => {
                                                    try {
                                                        if (auth) {
                                                            await firebaseSignOut(auth);
                                                        }
                                                    } catch (error) {
                                                        console.error("Firebase de-authentication loop exception caught:", error);
                                                    } finally {
                                                        localStorage.clear();
                                                        sessionStorage.clear();
                                                        setStudentUser(null);
                                                        setStudentName('');
                                                        window.location.reload();
                                                    }
                                                }}
                                            >
                                                Sign Out
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="content-col content-col-right">
                    <div className="col-inner">
                        <PortalHero
                            accent="Staff Portal"
                            description="Access your account to manage university resources and services."
                            features={STAFF_FEATURES}
                        />
                        <div className="card-stack">
                            <h2 className="side-label">Staff Portal</h2>
                            <h2 className="card-section-title">Log in as staff/admin</h2>
                            <div className="login-card">
                                <img src="/OLFU_official_logo.png" alt="OLFU seal" className="card-logo" />
                                
                                {formView === 'login' && (
                                    <>
                                        <div className="login-header">
                                            <h1 className="login-title">Log in</h1>
                                            <p className="login-subtitle">Staff Account</p>
                                        </div>
                                        {errormessage && <div className="error-banner">{errormessage}</div>}
                                        
                                        <form onSubmit={handlelogin} className="input-form" onFocus={() => setActiveSide('right')}>
                                            <div className="form-group">
                                                <label className="form-label">Email</label>
                                                <div className="input-icon-wrap">
                                                    <MailIcon className="input-icon" />
                                                    <input type="email" required placeholder="Enter your email address" className="login-input" value={email} onChange={(e) => setEmail(e.target.value)} />
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Password</label>
                                                <div className="password-input-wrapper">
                                                    <LockIcon className="input-icon" />
                                                    <input type={showLoginPassword ? "text" : "password"} required placeholder="Enter your password" className="login-input password-field-override" value={password} onChange={(e) => setPassword(e.target.value)}/>
                                                    <button type="button" className="password-toggle-btn" aria-label={showLoginPassword ? "Hide password" : "Show password"} onClick={() => setShowLoginPassword(!showLoginPassword)}>
                                                        {showLoginPassword ? <EyeOffIcon /> : <EyeIcon />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="forgot-row">
                                                <button type="button" className="forgot-password-link" onClick={() => setFormView('forgot')}>
                                                    Forgot Password?
                                                </button>
                                            </div>

                                            <button type="submit" className="login-submit-button">
                                                Authenticate Access
                                                <ArrowRightIcon />
                                            </button>
                                        </form>
                                    </>
                                )}

                                {formView === 'forgot' && (
                                    <>
                                        <div className="login-header">
                                            <h1 className="login-title">Reset Password</h1>
                                            <p className="login-subtitle">Enter your email to receive a recovery link</p>
                                        </div>
                                        {successMessage && <div className="success-banner">{successMessage}</div>}
                                        
                                        <form onSubmit={handleRequestReset} className="input-form">
                                            <div className="form-group">
                                                <label className="form-label">Account Email Address</label>
                                                <div className="input-icon-wrap">
                                                    <MailIcon className="input-icon" />
                                                    <input type="email" required placeholder="username@olfu.edu.ph" className="login-input" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                                                </div>
                                            </div>

                                            <button type="submit" className="login-submit-button">
                                                Send Recovery Link
                                                <ArrowRightIcon />
                                            </button>

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
                                            <h1 className="login-title">Update Password</h1>
                                            <p className="login-subtitle">Configure your new system operator credentials</p>
                                        </div>
                                        
                                        <form onSubmit={handleUpdatePassword} className="input-form">
                                            <div className="settings-field-group">
                                                <label className="reset-field-label">New Password</label>
                                                <div className="password-input-wrapper">
                                                    <LockIcon className="input-icon" />
                                                    <input type={showPass ? "text" : "password"} required className="form-input password-field-override" placeholder="Minimum 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}/>
                                                    <button type="button" className="password-toggle-btn" aria-label={showPass ? "Hide password" : "Show password"} onClick={() => setShowPass(!showPass)}>
                                                        {showPass ? <EyeOffIcon /> : <EyeIcon />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="settings-field-group">
                                                <label className="reset-field-label">Confirm New Password</label>
                                                <div className="password-input-wrapper">
                                                    <LockIcon className="input-icon" />
                                                    <input type={showConfirmPass ? "text" : "password"} required className="form-input password-field-override" placeholder="Re-type your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}/>
                                                    <button type="button" className="password-toggle-btn" aria-label={showConfirmPass ? "Hide password" : "Show password"} onClick={() => setShowConfirmPass(!showConfirmPass)}>
                                                        {showConfirmPass ? <EyeOffIcon /> : <EyeIcon />}
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
            </div>

            <footer className="portal-footer">
                <div className="footer-left-zone">
                    <p>© {new Date().getFullYear()} Our Lady of Fatima University. All Rights Reserved.</p>
                    <p className="footer-developer-credit">
                        Developed by <span>CCS TechForge Society</span> (Developer: Westley Delos Santos & Sushane Vendiola; Frontend/UI: Jul Arabani)
                    </p>
                </div>
                <div className="footer-right-zone">
                    <a href="https://fatima.edu.ph" target="_blank" rel="noopener noreferrer">OLFU Web Portal</a>
                    <span className="footer-divider">•</span>
                    <a href="#" onClick={(e) => { e.preventDefault(); alert("System Status: Operational. All secure API connections verified."); }}>System Infrastructure Logs</a>
                </div>
            </footer>
        </div>
    );
}
