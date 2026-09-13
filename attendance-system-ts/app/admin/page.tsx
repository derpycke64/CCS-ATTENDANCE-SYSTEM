'use client';

import {Suspense} from 'react';
import React, { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { QRCodeSVG } from "qrcode.react";
import "./admincss.css";
import { useSearchParams, useRouter } from 'next/navigation';




interface Eventstuff{
    id:string;
    title:string;
    description:string;
    latitude:number;
    longitude:number;
    radius_meters:number;
    is_active:boolean;
}
interface Attendancestuff{
    id:string;
    eventid:string;
    studentid:number;
    studentname:string;
    timestamp:string;
    verified_distance_meters:number;
}
interface Analyticsstuff{
    name:string;
    attendees:number;
}
interface Stafflogstuff{
    id:string;
    username:string;
    session_role:string;
    logged_in_at:string;
}
interface StaffProfilestuff{
    id:string;
    username:string;
    password:string;
    role:'admin' | 'superadmin';
    created_at:string;
}
export const dynamic = 'force-dynamic';
function AdmindashboardContent(){ 

    const [currentView, setCurrentView] = useState<'Project Overview' | 'Staff Accounts' | 'Events' | 'Monitoring Logs' | 'Settings'>('Project Overview');
    const [roles,setCurrentroles] = useState<'admin' | 'superadmin'>('admin');
    const [events,setEvents] = useState<Eventstuff[]>([]);
    const [analytics,setAnalytics] = useState<Analyticsstuff[]>([]);
    const [attendees,setattendeeslist] =useState<Attendancestuff[]>([]);
    const [form,setForm] = useState({title: '', desc: '', latitude: '', longitude: '', radius: '50'});
    const [origin,setOrigin] = useState('');

    const [stafflogs, setstafflogs] = useState<Stafflogstuff[]>([]);
    const [staffaccounts, setstaffaccounts] = useState<StaffProfilestuff[]>([]);
    const [newStaffEmail, setNewStaffEmail] = useState('');
    const [newStaffUser, setNewStaffUser] = useState('');
    const [newStaffPass, setNewStaffPass] = useState('');
    const [newStaffRole, setNewStaffRole] = useState<'admin' | 'superadmin'>('admin');

    const [totalToday, setTotalToday] = useState<number>(0);
    const [valenzuelaCount, setValenzuelaCount] = useState<number>(0);
    const [isDbConnected, setIsDbConnected] = useState<boolean>(true);

    const searchparams = useSearchParams();
    const router = useRouter();


    async function fetchdata(){
        const { data: eventsData, error: eventsError } = await supabase.from('events').select('*');
            if (eventsError) {
                console.error(`[Supabase Error] Failed to fetch 'events':`, eventsError.message, eventsError.details);
            }
        const {data: attendanceData, error:attendanceError} = await supabase.from('attendance').select('*');
            if (attendanceError) {
                console.error(`[Supabase Error] Failed to fetch 'attendance':`, attendanceError.message, attendanceError.details);
            }
        const {data: logsdata, error: logsError} = await supabase.from('staff_logs').select('*').order('logged_in_at', { ascending: false }).limit(10);
            if(logsError){
                console.error(`[Supabase Error] Failed to fetch 'logs':`, logsError.message, logsError.details )
            }
         const { data: profilesdata, error: profileserror } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(10);
            if (profileserror) {
                console.error(`[Supabase Error] Failed to fetch 'profiles':`, profileserror.message);
            }
        if (eventsError || attendanceError || logsError || profileserror) {
            setIsDbConnected(false);
        } else {
            setIsDbConnected(true);
        }
        const fetchedEvents = (eventsData || []) as Eventstuff[];
        const fetchedAttendance = (attendanceData || []) as Attendancestuff[];
        const fetchedstafflogs = (logsdata || []) as Stafflogstuff[];
        const fetchedstaffaccounts = (profilesdata || []) as StaffProfilestuff[];

        setEvents(fetchedEvents);
        setattendeeslist(fetchedAttendance);
        setstafflogs(fetchedstafflogs);
        setstaffaccounts(fetchedstaffaccounts);
        
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        
        const checkedInToday = fetchedAttendance.filter(att => {
            const attDate = new Date(att.timestamp);
            return attDate >= startOfToday;
        }).length;
        setTotalToday(checkedInToday);

        const valenzuelaAttendees = fetchedAttendance.filter(att => {
            const attDate = new Date(att.timestamp);
            const matchingEvent = fetchedEvents.find(e => e.id === att.eventid);
            return attDate >= startOfToday && matchingEvent?.title === 'Testing';
        }).length;
        setValenzuelaCount(valenzuelaAttendees);
       
        const chartData = fetchedEvents.map(evnt => ({
            name: evnt.title,
            attendees: fetchedAttendance.filter(att => att.eventid === evnt.id).length
            }));
        setAnalytics(chartData);
    }

    const handleassignAdmin = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        const cleanUsername = newStaffUser.toLowerCase().trim();


        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: newStaffEmail,
            password: newStaffPass,
        });

        if (authError || !authData.user) {
            return alert(`Auth Failure: ${authError?.message}`);
        }


        const { error: profileError } = await supabase.from('profiles').insert([
            { id: authData.user.id, username: cleanUsername, role: newStaffRole }
        ]);

        if (profileError) {
            alert(`Profile error: ${profileError.message}`);
        } else {
            alert('Secure staff account deployed successfully!');
            setNewStaffUser('');
            setNewStaffEmail('');
            setNewStaffPass('');
            fetchdata();
        }
    };

    const handleremoveAdmin = async (id: string, targetedRole: string) => {
        if (targetedRole === 'superadmin') {
            return alert('Security Block: Superadmin structural privilege lines cannot be deleted.');
        }

        const check = window.confirm("Permanently delete this admin account?");

        if (check) {
            const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) alert(error.message);
            fetchdata();
        }
    };

    const handleCreateEvent = async (Ev: React.SubmitEvent<HTMLFormElement>) => {
        Ev.preventDefault();
        if (!form.title || !form.latitude || !form.longitude) return alert('Please fill in required fields');

        const { error } = await supabase.from('events').insert([
        {
            title: form.title,
            description: form.desc,
            event_date: new Date().toISOString(),
            latitude: parseFloat(form.latitude),
            longitude: parseFloat(form.longitude),
            radius_meters: parseFloat(form.radius),
            is_active: false
        }
        ]);

        if (error) {
            alert(`Error creating event: ${error.message}`);
            return;
        }

        setForm({ title: '', desc: '', latitude: '', longitude: '', radius: '50' });
        fetchdata();
    };

    const handleSetActiveEvent = async (id: string) => {
        const { error: deactivateError } = await supabase.from('events').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
        if (deactivateError) {
            return alert(`Error deactivating events: ${deactivateError.message}`);
        }
        const { error } = await supabase.from('events').update({ is_active: true }).eq('id', id);
        if (error) {
            alert(`Error activating event: ${error.message}`);
        } else {
            fetchdata();
        }
    };
    
    const handleDeactivateEvent = async (id: string) => {
            const { error } = await supabase.from('events').update({ is_active: false }).eq('id', id);
            if (error) {
                alert(`Error deactivating event: ${error.message}`);
            } else {
                fetchdata();
            }
    };


    const handleDeleteEvent = async (id: string) => {
        if (roles !== 'superadmin') {
            return alert('Access Denied: Only a Superadmin can delete events.');
        }
        const confirmDelete = window.confirm('Are you sure you want to delete this event? This will erase all attendance records attached to it.');
        if (!confirmDelete) return;
    
        const { error } = await supabase.from('events').delete().eq('id', id);

        if (error) {
            console.error("Supabase Error Context:", error); 
            alert(`Error: ${error.message}. ${error.hint || ''}`);
        } else {
            fetchdata();
        }
    };

    const handleDeleteAttendance = async (id: string) => {
        if (roles !== 'superadmin') {
            window.alert("Access denied. Only superadmins can delete attendance records.");
        return;
    }

        const check = window.confirm("Are you sure you want to delete this student attendance??")
        if (check){
            await supabase.from('attendance').delete().eq('id', id);
            fetchdata(); 
        }
    };

    const handleDeleteStaffLog = async (id: string) => {
        if (roles !== 'superadmin') {
            window.alert("Access denied. Only superadmins can delete staff logs.");
        return;
    }
        const check = window.confirm("Are you sure you want to delete this staff log?")
        if (check){
            await supabase.from('staff_logs').delete().eq('id', id);
            fetchdata(); 
        }
    };
    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };


    const getEventTitle = (id: string) => {
        return events.find(e => e.id === id)?.title || 'Unknown Event';
    };

    
    useEffect(() => {
        async function loadSession() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (!profile) {
                router.push('/login');
                return;
            }
            setCurrentroles(profile.role);
        }
        loadSession();
        setOrigin(window.location.origin);
        fetchdata();
    }, []);
    
return (
    <div className="dashboard-container">
        <aside className='dashboard-sidebar'>
            <div className='main-title'>
                <h3>Control Panel</h3>
                <p className="role-badge"> Viewing as: <span>{roles === 'superadmin' ? 'Super Admin' : 'Admin'}</span></p>
            </div>
            <nav className='tab-container'>
                <button onClick={() => setCurrentView('Project Overview')}className={`tab-button ${currentView === 'Project Overview' ? 'active' : ''}`}> Project Overview</button>
                {(roles === 'superadmin') && (<><button onClick={() => setCurrentView('Staff Accounts')} className={`tab-button ${currentView === 'Staff Accounts' ? 'active' : ''}`}>Staff Accounts</button> <button onClick={() => setCurrentView('Events')} className={`tab-button ${currentView === 'Events' ? 'active' : ''}`}>Event Creation</button><button onClick={() => setCurrentView('Monitoring Logs')} className={`tab-button ${currentView === 'Monitoring Logs' ? 'active' : ''}`}>Monitoring Logs</button><button onClick={() => setCurrentView('Settings')} className={`tab-button ${currentView === 'Settings' ? 'active' : ''}`}>Settings</button></>)}
                {(roles === 'admin') && (<><button onClick={() => setCurrentView('Events')} className={`tab-button ${currentView === 'Events' ? 'active' : ''}`}>Event Creation</button><button onClick={() => setCurrentView('Monitoring Logs')} className={`tab-button ${currentView === 'Monitoring Logs' ? 'active' : ''}`}>Monitoring Logs</button><button onClick={() => setCurrentView('Settings')} className={`tab-button ${currentView === 'Settings' ? 'active' : ''}`}>Settings</button></>)}
            </nav>
        </aside>
        <main className="dashboard-main-content">
            <header className="main-viewport-header">
                <div className="header-desc">
                    <h2>{currentView.toUpperCase().replace('-', ' ')}</h2>
                </div>
                <div>
                    <button className="header-action-btn" onClick={handleSignOut}>Sign Out</button>
                </div>
            </header>

            {currentView === 'Project Overview' && (
                <div className="superadmin-layout-stack">
                    <div className="analytics-metrics-grid">
                        <div className="metric-card">
                            <div className="metric-data-block">
                                <h3>Total Checked-In today</h3>
                                <p className="metric-number">{totalToday}</p>
                            </div>
                        </div>

                        
                        <div className="metric-card">
                            <div className="metric-data-block">
                                <h3>Students Checked-In</h3>
                                <p className="metric-number">{valenzuelaCount}</p>
                                <span className="metric-trend text-muted">Valenzuela campus</span>
                            </div>
                        </div>
                        
                        <div className="metric-card">
                            <div className="metric-icon-wrap database-tint" style={{ backgroundColor: isDbConnected ? '#ecfdf5' : '#fef2f2' }}>
                                {isDbConnected ? '⚡' : '⚠️'}
                            </div>
                            <div className="metric-data-block">
                                <h3>Supabase Core Status</h3>
                                <p className="metric-number" style={{ color: isDbConnected ? '#111827' : '#dc2626' }}>
                                    {isDbConnected ? 'Operational' : 'Disconnected'}
                                </p>
                                <span className={`metric-trend ${isDbConnected ? 'trend-stable' : 'text-danger'}`}>
                                    {isDbConnected ? '● API Connected' : '● Verification Failed'}
                                </span>
                            </div>
                        </div>
                        
                    </div>
                </div>
            )}

           

            {currentView === 'Staff Accounts' && roles === 'superadmin' && (
                <div className="superadmin-layout-stack">
                    <div className="card-panel admin-provisioning-panel">
                        <h2 className="section-title">Staff Provisioning & Role Administration</h2>
                        <form onSubmit={handleassignAdmin} className="input-form-row">
                            <input type="text" placeholder="New Username" required className="form-input" value={newStaffUser} onChange={e => setNewStaffUser(e.target.value)} />
                            <input type="email" placeholder="Email Address" required className="form-input" value={newStaffEmail} onChange={e => setNewStaffEmail(e.target.value)} />
                            <input type="password" placeholder="Assign Password" required className="form-input" value={newStaffPass} onChange={e => setNewStaffPass(e.target.value)} />
                            <select className="form-input" value={newStaffRole} onChange={e => setNewStaffRole(e.target.value as 'admin' | 'superadmin')}>
                                <option value="admin">ADMIN</option>
                                <option value="superadmin">SUPERADMIN</option>
                            </select>
                            <button type="submit" className="submit-button">Deploy Profile Access</button>
                        </form>
                    </div>
                    <div className="card-panel">
                        <h2 className="section-title">Current System Operator Manifest (Authorized Accounts)</h2>
                        <div className="table-wrapper">
                            <table className="table-table">
                                <thead>
                                    <tr style={{ backgroundColor: '#f0fdf4' }}>
                                        <th style={{ color: '#166534' }}>System Username ID</th>
                                        <th style={{ color: '#166534' }}>Current Role</th>
                                        <th style={{ color: '#166534' }}>Administrative Action Options</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {staffaccounts.map(account => (
                                    <tr key={account.id} className={account.role === 'superadmin' ? 'audit-row-super' : 'audit-row-standard'}>
                                        <td style={{ fontWeight: 'bold' }}>{account.username}</td>
                                        <td>
                                        <span className={`admin-badge-container ${account.role === 'superadmin' ? 'admin-badge-super' : 'admin-badge-standard'}`}>
                                            {account.role}
                                        </span>
                                        </td>
                                        <td>
                                            {account.username !== 'superadmin' ? (
                                                <button type="button" onClick={() => handleremoveAdmin(account.id, account.username)} className="revoke-access-btn">
                                                Revoke role Access
                                                </button>
                                            ) : (
                                                <span className="protected-badge">Protected System Operator</span>
                                            )}
                                        </td>
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            {currentView === 'Events' && (
                <div className="superadmin-layout-stack">
                    <div className="card-panel">
                        <h2 className="section-title">Create Event</h2>
                        <form onSubmit={handleCreateEvent} className="input-form-row">
                            <input type="text" placeholder="Event Title" required className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                            <input type="text" placeholder="Description" className="form-input" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />
                            <input type="number" step="any" placeholder="Latitude" required className="form-input" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} />
                            <input type="number" step="any" placeholder="Longitude" required className="form-input" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} />
                            <input type="number" placeholder="Radius (meters)" required className="form-input" value={form.radius} onChange={e => setForm({ ...form, radius: e.target.value })} />
                            <button
                                type="button"
                                className="submit-button"
                                onClick={() => {
                                    if (!navigator.geolocation) return alert('Geolocation not supported by this browser.');
                                    navigator.geolocation.getCurrentPosition(
                                        (pos) => setForm({
                                            ...form,
                                            latitude: pos.coords.latitude.toString(),
                                            longitude: pos.coords.longitude.toString()
                                        }),
                                        () => alert('Unable to get your location.')
                                    );
                                }}
                            >
                                Use My Current Location
                            </button>
                            <button type="submit" className="submit-button">Create Event</button>
                        </form>
                    </div>

                    <div className="card-panel">
                        <h2 className="section-title">Existing Events</h2>
                        <div className="table-wrapper">
                            <table className="table-table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Description</th>
                                        <th>Radius</th>
                                        <th>Action</th>
                                        <th>Delete Event</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af', padding: '16px' }}>
                                                No events created yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        events.map(evt => (
                                            <tr key={evt.id}>
                                                <td style={{ fontWeight: 500 }}>{evt.title}</td>
                                                <td>{evt.description}</td>
                                                <td>{evt.radius_meters}m</td>
                                                <td>
                                                    {evt.is_active && <span className="protected-badge" style={{ marginRight: '8px' }}>Active</span>}
                                                    {evt.is_active ? (
                                                        <button type="button" onClick={() => handleDeactivateEvent(evt.id)} className="revoke-access-btn">Deactivate</button>
                                                    ) : (
                                                        <button type="button" onClick={() => handleSetActiveEvent(evt.id)} className="submit-button">Set Active</button>
                                                    )}
                                                </td>
                                                    <td>
                                                    <button type="button" onClick={() => handleDeleteEvent(evt.id)} className="revoke-access-btn">Delete</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
                {currentView === 'Monitoring Logs' && (
                <div className="superadmin-layout-stack">
                    <div className="card-panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="section-title">Attendance Logs</h2>
                            <button type="button" onClick={fetchdata} className="submit-button">Refresh</button>
                        </div>
                        <h2 className="section-title">Attendance Logs</h2>
                        <div className="table-wrapper">
                            <table className="table-table">
                                <thead>
                                    <tr>
                                        <th>Student Number</th>
                                        <th>Surname / Name</th>
                                        <th>Event Attended</th>
                                        <th>Distance Verified</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendees.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af', padding: '16px' }}>
                                        No students logged yet.
                                        </td>
                                    </tr>
                                    ) : (
                                    attendees.map(log => (
                                        <tr key={log.id}>
                                            <td className="student-num-cell">{log.studentid}</td>
                                            <td style={{ fontWeight: 500 }}>{log.studentname}</td>
                                            <td>{getEventTitle(log.eventid)}</td>
                                            <td style={{ color: '#6b7280', fontSize: '12px' }}>
                                                {Math.round(log.verified_distance_meters)}m away
                                            </td>
                                            <td>
                                                <button type="button" onClick={() => handleDeleteAttendance(log.id)} className="revoke-access-btn">Delete</button>
                                            </td>
                                        </tr>
                                    ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card-panel">
                    <h2 className="section-title">Login History</h2>
                        <div className="table-wrapper">
                            <table className="table-table">
                                <thead>
                                    <tr className="audit-table-header">
                                        <th>Staff User ID</th>
                                        <th>Assigned Role</th>
                                        <th>Timestamp of Log in</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stafflogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: '16px' }}>
                                        No staff logins registered yet.
                                        </td>
                                    </tr>
                                    ) : (
                                    stafflogs.map(staff => (
                                        <tr key={staff.id} className={staff.session_role === 'superadmin' ? 'audit-row-super' : 'audit-row-standard'}>
                                            <td className="operator-user-cell">{staff.username}</td>
                                            <td>
                                                <span className={`admin-badge-container ${staff.session_role === 'superadmin' ? 'admin-badge-super' : 'admin-badge-standard'}`}>
                                                {staff.session_role}
                                                </span>
                                            </td>
                                            <td className="timestamp-mono-cell">
                                                {new Date(staff.logged_in_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                                            </td>
                                            <td>
                                                <button type="button" onClick={() => handleDeleteStaffLog(staff.id)} className="revoke-access-btn">Delete</button>
                                            </td>
                                        </tr>
                                    ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                )}
                {currentView === 'Settings' && (
                    <div className="superadmin-layout-stack">
                        <div className="card-panel">
                            <h3 className="section-title">System Variables & Security Settings</h3>
                            <form className="input-form-row" onSubmit={(e) => e.preventDefault()}>
                                <div className="settings-field-group">
                                    <label className="settings-label">Master Default Check-In Radius (Meters)</label>
                                    <input type="number" className="form-input" defaultValue={50} placeholder="e.g. 50" />
                                    <span className="settings-help-text">Fallback radius distance calculation window when no event radius is explicitly specified.</span>
                                </div>

                                <div className="settings-field-group">
                                    <label className="settings-label">Session Timeout Protocol</label>
                                    <select className="form-input" defaultValue="8">
                                        <option value="1">1 Hour (High Security)</option>
                                        <option value="8">8 Hours (Standard Operator Shift)</option>
                                        <option value="24">24 Hours (Persistent Access)</option>
                                    </select>
                                </div>

                                <button type="submit" className="submit-button" style={{maxWidth: '200px'}}>
                                    Save Global Variables
                                </button>
                            </form>
                        </div>
                    </div>
                )}
        </main>
    </div>
    
);
}

export default function Admindashboard() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading Admin Panel...</div>}>
      <AdmindashboardContent />
    </Suspense>
  );
}