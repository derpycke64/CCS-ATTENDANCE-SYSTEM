'use client';

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
}
interface Attendancestuff{
    id:string;
    eventid:string;
    studentid:number;
    studentname:string;
    timechecked:string;
    distancemeter:number;
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
interface StaffAccountstuff{
    id:string;
    username:string;
    password:string;
    role:'admin' | 'superadmin';
    created_at:string;
}
export default function Admindashboard(){ 

    const [currentView, setCurrentView] = useState<'Project Overview' | 'Staff Accounts' | 'Events' | 'Monitoring Logs' | 'Settings'>('Project Overview');
    const [roles,setCurrentroles] = useState<'admin' | 'superadmin'>('admin');
    const [events,setEvents] = useState<Eventstuff[]>([]);
    const [analytics,setAnalytics] = useState<Analyticsstuff[]>([]);
    const [attendees,setattendeeslist] =useState<Attendancestuff[]>([]);
    const [form,setForm] = useState({title: '', desc: '', latitude: '', longitude: '', radius: '50'});
    const [origin,setOrigin] = useState('');

    const [stafflogs, setstafflogs] = useState<Stafflogstuff[]>([]);
    const [staffaccounts, setstaffaccounts] = useState<StaffAccountstuff[]>([]);
    const [newStaffUser, setNewStaffUser] = useState('');
    const [newStaffPass, setNewStaffPass] = useState('');
    const [newStaffRole, setNewStaffRole] = useState<'admin' | 'superadmin'>('admin');

    const searchparams = useSearchParams();
    const router = useRouter();


    async function fetchdata(){
        const {data: eventsData } = await supabase.from('events').select('*');
        const {data: attendanceData} = await supabase.from('attendance').select('*');
        const {data: logsdata} = await supabase.from('staff_logs').select('*').order('logged_in_at', { ascending: false }).limit(10);
        const {data: staffaccountsdata} = await supabase.from('staff_accounts').select('*').order('created_at', {ascending: false}).limit(10);
        
        const fetchedEvents = (eventsData || []) as Eventstuff[];
        const fetchedAttendance = (attendanceData || []) as Attendancestuff[];
        const fetchedstafflogs = (logsdata || []) as Stafflogstuff[];
        const fetchedstaffaccounts = (staffaccountsdata || []) as StaffAccountstuff[];

        setEvents(fetchedEvents);
        setattendeeslist(fetchedAttendance);
        setstafflogs(fetchedstafflogs);
        setstaffaccounts(fetchedstaffaccounts);

        const chartData = fetchedEvents.map(evnt => ({
            name: evnt.title,
            attendees: fetchedAttendance.filter(att => att.eventid === evnt.id).length
            }));
        setAnalytics(chartData);
    }
    const handleassignstaff = async (Ev: React.SubmitEvent<HTMLFormElement>) =>{
        Ev.preventDefault();
        if (!newStaffUser || !newStaffPass) return alert (
            'Fill in required fields'
        )
        const Staffusername = newStaffUser.toLocaleLowerCase().trim();

        const {error} = await supabase.from('staff_accounts').insert([{username: Staffusername, password: newStaffPass, role: newStaffRole}]);
        if (error){
            alert(`eror creating profile: ${error.message}`);
        } else{
            alert(`account successfully createg for: ${Staffusername}`);
            setNewStaffPass('');
            setNewStaffUser('');
            fetchdata();
        }
    }
    const handleremovestaff = async (id: string, targetuser:string) =>
    {
        if (targetuser === 'superadmin'){
            return alert('Superadmin Account cannot be deleted!');
        }
        const confirmrevoke = window.confirm (`are you sure you want to permanently delete this staff role for ${targetuser}?`);
        if(!confirmrevoke){
            return
        }
        const {error} = await supabase.from('staff_accounts').delete().eq('id', id);
        if (error){
            alert (`something went wrong. ${error.message}`);
        } else{
            fetchdata();
        }
    }


    const handleCreateEvent = async (Ev: React.SubmitEvent<HTMLFormElement>) => {
        Ev.preventDefault();
        if (!form.title || !form.latitude || !form.longitude) return alert('Please fill in required fields');

        await supabase.from('events').insert([
        {
            title: form.title,
            description: form.desc,
            event_date: new Date().toISOString(),
            latitude: parseFloat(form.latitude),
            longitude: parseFloat(form.longitude),
            radius_meters: parseFloat(form.radius)
        }
        ]);

        setForm({ title: '', desc: '', latitude: '', longitude: '', radius: '50' });
        fetchdata();
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
        const check = window.confirm("Are you sure you want to delete this student attendance??")
        if (check){
            await supabase.from('attendance').delete().eq('id', id);
            fetchdata(); 
        }
    };
    const handleDeleteStaffLog = async (id: string) => {
        const check = window.confirm("Are you sure you want to delete this staff log?")
        if (check){
            await supabase.from('staff_logs').delete().eq('id', id);
            fetchdata(); 
        }
    };

    const getEventTitle = (id: string) => {
        return events.find(e => e.id === id)?.title || 'Unknown Event';
    };

    useEffect(() => {setOrigin(window.location.origin);fetchdata();
        document.title = "Admin Dashboard | Attendance System";
        
        const urlRole = searchparams.get('role') as 'admin' | 'superadmin' | null;
        if (urlRole) {
            setCurrentroles(urlRole);
        }
        setOrigin(window.location.origin);
        fetchdata();
        }, [searchparams]);
    
    return (
        <div className="dashboard-container">
            <aside className='dashboard-sidebar'>
                <div className='main-title'>
                    <h3>Control Panel</h3>
                    <p className="role-badge"> Viewing as: <span>{roles === 'superadmin' ? 'Super Admin' : 'Admin'}</span></p>
                </div>
                <nav className='tab-container'>
                    <button onClick={() => setCurrentView('Project Overview')}className={`tab-button ${currentView === 'Project Overview' ? 'active' : ''}`}>
                    Project Overview
                    </button>
                    {(roles === 'superadmin') && (
                        <>
                            <button onClick={() => setCurrentView('Staff Accounts')} className={`tab-button ${currentView === 'Staff Accounts' ? 'active' : ''}`}>Staff Accounts</button> 
                            <button onClick={() => setCurrentView('Events')} className={`tab-button ${currentView === 'Events' ? 'active' : ''}`}>Event Creation</button>
                            <button onClick={() => setCurrentView('Monitoring Logs')} className={`tab-button ${currentView === 'Monitoring Logs' ? 'active' : ''}`}>Monitoring Logs</button>
                            <button onClick={() => setCurrentView('Settings')} className={`tab-button ${currentView === 'Settings' ? 'active' : ''}`}>Settings</button>
                        </>
                    )}
                    {(roles === 'admin') && (
                         <>
                            <button onClick={() => setCurrentView('Events')} className={`tab-button ${currentView === 'Events' ? 'active' : ''}`}>Event Creation</button>
                            <button onClick={() => setCurrentView('Monitoring Logs')} className={`tab-button ${currentView === 'Monitoring Logs' ? 'active' : ''}`}>Monitoring Logs</button>
                            <button onClick={() => setCurrentView('Settings')} className={`tab-button ${currentView === 'Settings' ? 'active' : ''}`}>Settings</button>
                        </>
                    )}
                </nav>
            </aside>
            <main className="dashboard-main-content">
                <header className="main-viewport-header">
                    <div className="header-desc">
                        <h2>{currentView.toUpperCase().replace('-', ' ')}</h2>
                    </div>
                    <div>
                        <button className="header-action-btn" onClick={() => router.push('/login')}>Sign Out</button>
                    </div>
                </header>

                {currentView === 'Project Overview' && (
                    <div> wala pa</div>
                )}

                {currentView === 'Staff Accounts' && roles === 'superadmin' && (
                    <div className="superadmin-layout-stack">
                        <div className="card-panel admin-provisioning-panel">
                            <h2 className="section-title">Staff Provisioning & Role Administration</h2>
                            <form onSubmit={handleassignstaff} className="input-form-row">
                                <input type="text" placeholder="New Username" required className="form-input" value={newStaffUser} onChange={e => setNewStaffUser(e.target.value)} />
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
                                                    <button type="button" onClick={() => handleremovestaff(account.id, account.username)} className="revoke-access-btn">
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
                    <div>
                        wala pa rin
                    </div>
                 )}
                 {currentView === 'Monitoring Logs' && (
                    <div className="superadmin-layout-stack">
                        <div className="card-panel">
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
                                            <td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: '16px' }}>
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
                                                    {Math.round(log.distancemeter)}m away
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
                                            <td colSpan={3} style={{ textAlign: 'center', color: '#9ca3af', padding: '16px' }}>
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
                 {(currentView == "Settings") && (
                    <div>wala pa</div>
                 )}
            </main>
        </div>
    );
}

