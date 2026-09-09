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
                            <input type="number" required placeholder="Enter your student ID" className="login-input" value={studentid || ''} onChange={(e) => setStudentId(e.target.value)}/>
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
                <h2 className="side-label">Staff Login</h2>
                <h2 className="card-section-title">Log in as staff/admin</h2>
                <div className="login-card">
                    <div className="login-header">
                        <h1 className="login-title">Log in</h1>
                        <p className="login-subtitle">Sign in to manage stuff</p>
                    </div>
                    {errormessage && <div className="error-banner">{errormessage}</div>}
                    <form onSubmit={handlelogin} className="input-form" onFocus={() => setActiveSide('right')}>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input type="email" required placeholder="Enter your email" className="login-input" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input type="password" required placeholder="••••••••" className="login-input" value={password} onChange={(e) => setPassword(e.target.value)}  />
                        </div>

                        <button type="submit" className="login-submit-button">Authenticate Access</button>
                    </form>
                </div>
            </div>

        </div>
    </div>
);
}
    //reminder to add a spam protection for one guy checking in multiple times
     //reminder to add a spam protection for one guy checking in multiple times
 //reminder to add a spam protection for one guy checking in multiple times
      //reminder to add a spam protection for one guy checking in multiple times
       //reminder to add a spam protection for one guy checking in multiple times
