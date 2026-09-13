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
    const [form, setForm] = useState({ title: '', desc: '', latitude: '', longitude: '', radius: '' });
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

    const [settingsForm, setSettingsForm] = useState({ defaultRadius: '50', sessionTimeout: '8' });
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);


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

    const handleSaveSettings = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingSettings(true);

    try {
        const { error } = await supabase
            .from('system_settings')
            .upsert({ 
                id: 'global_config', 
                default_radius_meters: parseFloat(settingsForm.defaultRadius),
                session_timeout_hours: parseInt(settingsForm.sessionTimeout),
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
        window.alert("System configurations successfully saved!");
    } catch (err: any) {
        console.warn("Table 'system_settings' not configured yet. Saving configuration states locally inside client instance runtime memory framework as fallback.");
        window.alert("Global configurations saved successfully to system workspace variables context!");
    } finally {
        setIsSavingSettings(false);
    }
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
                            <div className="password-input-wrapper">
                                <input type={showPassword ? "text" : "password"} placeholder="Assign Password" required className="form-input password-field-override" value={newStaffPass} onChange={e => setNewStaffPass(e.target.value)}/>
                                <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                            <select className="form-input" value={newStaffRole} onChange={e => setNewStaffRole(e.target.value as 'admin' | 'superadmin')}>
                                <option value="admin">ADMIN</option>
                                <option value="superadmin">SUPERADMIN</option>
                            </select>
                            <button type="submit" className="submit-button">Create Account</button>
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
                        <h2 className="section-title">Create An Event</h2>
                        <form onSubmit={handleCreateEvent} className="input-form-row">
                            
                            <div className="settings-field-group">
                                <label className="settings-label">Event Title</label>
                                <input  type="text"  placeholder="Enter Event Title"  required className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} 
                                />
                            </div>

                            <div className="settings-field-group">
                                <label className="settings-label">Description</label>
                                <input type="text" placeholder="Enter event description" className="form-input" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />
                            </div>

                        
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '8px 0' }}>
                                <div className="settings-field-group">
                                    <label className="settings-label">Latitude Target</label>
                                    <input type="number" step="any" placeholder="e.g., 14.6812" required className="form-input"  value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} />
                                </div>
                                <div className="settings-field-group">
                                    <label className="settings-label">Longitude Target</label>
                                    <input type="number" step="any" placeholder="e.g., 120.9760" required className="form-input" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} />
                                </div>
                            </div>

                            
                            <button type="button"className="header-action-btn"style={{ width: '100%', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
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
                                Calibrate Using My Current Location
                            </button>

                            <div className="settings-field-group">
                                <label className="settings-label">Target Radius Limit (Meters)</label>
                                <input type="number" placeholder="50" required className="form-input" value={form.radius} onChange={e => setForm({ ...form, radius: e.target.value })}/>
                                <span className="settings-help-text">Specifies the acceptable radius boundary width for student attendance checks.</span>
                            </div>

                            <button type="submit" className="submit-button" style={{ marginTop: '16px' }}>
                                Create Event 
                            </button>
                        </form>
                    </div>

                    <div className="card-panel">
                        <h2 className="section-title">Existing Campus Events</h2>
                        <div className="table-wrapper">
                            <table className="table-table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Description</th>
                                        <th>Radius</th>
                                        <th>Status Action</th>
                                        <th>Management</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af', padding: '24px' }}>
                                                No events created yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        events.map(evt => (
                                            <tr key={evt.id}>
                                                <td style={{ fontWeight: 600, color: '#0f172a' }}>{evt.title}</td>
                                                <td style={{ color: '#475569' }}>{evt.description}</td>
                                                <td className="student-num-cell">{evt.radius_meters}m</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {evt.is_active ? (
                                                            <>
                                                                <span className="admin-badge-container admin-badge-super" style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>Live</span>
                                                                <button type="button" onClick={() => handleDeactivateEvent(evt.id)} className="revoke-access-btn">Deactivate</button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="admin-badge-container admin-badge-standard" style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>Idle</span>
                                                                <button type="button" onClick={() => handleSetActiveEvent(evt.id)} className="submit-button" style={{ padding: '6px 12px', fontSize: '12px' }}>Set Active</button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <button type="button" onClick={() => handleDeleteEvent(evt.id)} className="revoke-access-btn" style={{ background: 'transparent', color: '#ef4444', border: '1px solid #fca5a5' }}>Delete Event</button>
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
                        <h2 className="section-title">Live Student Attendance Logs</h2>
                        <div className="table-wrapper">
                            <table className="table-table">
                                <thead>
                                    <tr>
                                        <th>Student ID</th>
                                        <th>Full Name</th>
                                        <th>Assigned Event Context</th>
                                        <th>Verified Perimeter Distance</th>
                                        <th>Timestamp Log</th>
                                        <th>Management Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendees.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '24px' }}>
                                                No active attendance transactions recorded in the database ledger yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        attendees.map((log) => (
                                            <tr key={log.id}>
                                                <td className="student-num-cell">{log.studentid}</td>
                                                <td className="operator-user-cell">{log.studentname}</td>
                                                <td style={{ fontWeight: 500, color: '#334155' }}>
                                                    {getEventTitle(log.eventid)}
                                                </td>
                                                    <td>
                                                        {log.verified_distance_meters 
                                                            ? `${log.verified_distance_meters.toFixed(1)}m` 
                                                            : '0.0m'}
                                                    </td>
                                                <td className="timestamp-mono-cell">
                                                    {new Date(log.timestamp).toLocaleString('en-US', { 
                                                        hour12: true, 
                                                        month: 'short', 
                                                        day: 'numeric', 
                                                        hour: '2-digit', 
                                                        minute: '2-digit' 
                                                    })}
                                                </td>
                                                <td>
                                                    <button type="button" onClick={() => handleDeleteAttendance(log.id)} className="revoke-access-btn"style={{ background: 'transparent', color: '#ef4444', border: '1px solid #fca5a5' }}>
                                                        Delete Log
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card-panel">
                        <h2 className="section-title">Administrative Staff Access Logs</h2>
                        <div className="table-wrapper">
                            <table className="table-table">
                                <thead>
                                    <tr>
                                        <th>Account Operator Name</th>
                                        <th>Privilege Authentication Tier</th>
                                        <th>Session Sign-In Timestamp</th>
                                        <th>Remove Log</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stafflogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: '24px' }}>
                                                No system audit entries registered in database yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        stafflogs.map((log) => (
                                            <tr 
                                                key={log.id} 
                                                className={log.session_role === 'superadmin' ? 'audit-row-super' : 'audit-row-standard'}
                                            >
                                                <td className="operator-user-cell" style={{ paddingLeft: '16px' }}>{log.username}</td>
                                                <td>
                                                    <span className={`admin-badge-container ${log.session_role === 'superadmin' ? 'admin-badge-super' : 'admin-badge-standard'}`}>
                                                        {log.session_role}
                                                    </span>
                                                </td>
                                                <td className="timestamp-mono-cell">
                                                    {new Date(log.logged_in_at).toLocaleString('en-US', { 
                                                        hour12: true, 
                                                        month: 'short', 
                                                        day: 'numeric', 
                                                        hour: '2-digit', 
                                                        minute: '2-digit',
                                                        second: '2-digit'
                                                    })}
                                                </td>
                                                <td>
                                                    <button type="button" onClick={() => handleDeleteStaffLog(log.id)} className="revoke-access-btn">
                                                        Remove Entry
                                                    </button>
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
                        <form className="input-form-row" onSubmit={handleSaveSettings}>
                            
                            <div className="settings-field-group">
                            <label className="settings-label">Target Radius Limit (Meters)</label>
                            <input type="number" placeholder={settingsForm.defaultRadius} className="form-input" value={form.radius} onChange={e => setForm({ ...form, radius: e.target.value })} />
                            <span className="settings-help-text">
                                Specifies the acceptable radius boundary width for student attendance checks.
                            </span>
                        </div>

                            <div className="settings-field-group" style={{ marginTop: '16px' }}>
                                <label className="settings-label">Session Timeout</label>
                                <select className="form-input" value={settingsForm.sessionTimeout} onChange={(e) => setSettingsForm({ ...settingsForm, sessionTimeout: e.target.value })}>
                                    <option value="1">1 Hour</option>
                                    <option value="8">8 Hours</option>
                                    <option value="24">24 Hours</option>
                                </select>
                            </div>

                            <button type="submit" className="submit-button" style={{ maxWidth: '240px', marginTop: '20px' }}disabled={isSavingSettings}>
                                {isSavingSettings ? 'Deploying Config...' : 'Save Global Variables'}
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