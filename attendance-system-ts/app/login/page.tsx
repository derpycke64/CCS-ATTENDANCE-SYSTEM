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
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errormessage, setErrorMessage] = useState('');

    const [studentid, setStudentId] = useState('');
    const [studentname, setStudentName] = useState('');
    const [gpsVerified, setGpsVerified] = useState(false);
    const [loadingGps, setLoadingGps] = useState(true);
    const [gpsStatus, setGpsStatus] = useState("Locating ...");
    const [targetevent, setTargetEvent] = useState<Eventstuff | null>(null);
    const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);

    const handlelogin = async (evnt: React.SubmitEvent<HTMLFormElement>) => {
        evnt.preventDefault();
        setErrorMessage('');

        const Staffusername = username.toLocaleLowerCase().trim();

        const {data: staffData, error: fetchError} = await supabase.from('staff_accounts').select('*').eq('username', Staffusername).eq('password', password).maybeSingle();
        if(fetchError) {
            console.error("Full Supabase Database Error Context:", fetchError.message);
            return setErrorMessage(`Network timeout please try again later. ${fetchError.message}`);
        }

        if(staffData){
            await supabase.from('staff_logs').insert([{ username: Staffusername, session_role: staffData.role, logged_in_at: new Date().toISOString() }]);
            router.push(`/admin?role=${staffData?.role}`);
        }
         else {
            setErrorMessage('Invalid username or password');
        }
    }
    /*
    const handleStudentCheckIn = async (evnt: React.SubmitEvent<HTMLFormElement>) => {
        evnt.preventDefault();
        if(!studentid || !studentname) {
            return alert ('Please fill in required fields');
        }
        if(!gpsVerified ||!targetevent){ 
            return alert('You are not within the event range or no active event found');
        }
        const activeEventId = targetevent ? targetevent.id : "00000000-0000-0000-0000-000000000000";
        const {error: checkInError} = await supabase.from('attendance').insert([{studentid, studentname, eventid: activeEventId, timestamp: new Date().toISOString(), verified_distance_meters:calculatedDistance || 0}]);
        if(checkInError){
            alert   (`Error checking in: ${checkInError.message}`);
        }
            else{
                alert('successfully checked in');
                setStudentId('');
                setStudentName('');
            }
        }; add these back in later  and remove the duplicate when testing don*/
       const handleStudentCheckIn = async (evnt: React.SubmitEvent<HTMLFormElement>) => {
        evnt.preventDefault();
        if (!studentid || !studentname) {
            return alert('Please fill in required fields');
        }
        const activeEventId = targetevent ? targetevent.id : "00000000-0000-0000-0000-000000000000";
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
            alert(`Error checking in: ${checkInError.message}`);
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
            const {data: latestEvent, error } = await supabase.from('events').select('*').order('event_date').limit(1).single();
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
                if (distanceApart <= latestEvent.radius_meters || true) { // remove true later
                    setGpsVerified(true);
                    setGpsStatus(`Active Event: ${latestEvent.title} |  Location: you are in range.`);
                    setLoadingGps(false);
                } else {
                    setGpsStatus(`Active Event: ${latestEvent.title} |  Location: Denied! You are ${Math.round(distanceApart - latestEvent.radius_meters)}m outside the area.`);
                    setLoadingGps(false);
                }
            }
            ,() => {
                setGpsStatus("Unable to retrieve your location");
                setLoadingGps(false);
            }, {enableHighAccuracy:true}
        );
        }
        evaluateStudentRange();
    }, []);

            
    return(
        <div className="login-viewport">
            <header className="portal-main-header">
                OUR LADY OF FATIMA UNIVERSITY
            </header>
            <div className="student-check-in">
                <h2 className="card-section-title">Check in attendance</h2>
                <div className='student-card'>
                    <div className="login-header">
                        <h1 className="login-title">Check in</h1>
                        <p className="login-subtitle">This will be your attendance.</p>
                    </div>
                    <form onSubmit={handleStudentCheckIn} className="input-form">
                        <div className="form-group">
                            <label className="form-label">Student ID</label>
                            <input type="number" required placeholder="Enter your student ID" className="login-input" value={studentid || ''}onChange={(e) => setStudentId(e.target.value)}/>
                        </div>
                        <div className="form-group">
                            <label className='form-label'>Enter your name</label>
                            <input type="text" required placeholder="Enter your name" className="login-input" value={studentname || ''} onChange={(e) => setStudentName(e.target.value)}/>
                        </div>
                        <button type="submit" className="login-submit-button"  style={{ opacity: gpsVerified ? 1 : 0.5 }}    disabled={!gpsVerified}> Check In </button> 
                    </form>
                </div>
            </div>

            <div  className="gps-status-banner" style={{'--banner-bg': loadingGps ? '#f3f4f6' : (gpsVerified ? '#ecfdf5' : '#fef2f2'), '--banner-text': loadingGps ? '#4b5563' : (gpsVerified ? '#065f46' : '#991b1b'),'--banner-border': loadingGps ? '#e5e7eb' : (gpsVerified ? '#a7f3d0' : '#fee2e2')} as React.CSSProperties}> 
                {gpsStatus} 
            </div>

            <div className='staff-login-area'>
                <h2 className="card-section-title">Log in as staff/admin</h2>
                <div className="login-card">
                    <div className="login-header">
                        <h1 className="login-title">Log in</h1>
                        <p className="login-subtitle">Sign in to manage stuff</p>
                    </div>
                    {errormessage && <div className="error-banner">{errormessage}</div>}
                    <form onSubmit={handlelogin} className="input-form">
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input type="text" required placeholder="Enter role user ID" className="login-input" value={username} onChange={(e) => setUsername(e.target.value)} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input type="password" required placeholder="••••••••"className="login-input" value={password} onChange={(e) => setPassword(e.target.value)}  />
                        </div>

                    <button type="submit" className="login-submit-button">Authenticate Access</button>
                    </form>
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
