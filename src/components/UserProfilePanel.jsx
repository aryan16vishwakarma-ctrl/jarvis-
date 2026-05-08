import { useState, useEffect } from 'react';
import { updateEmail } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { X, User, Edit2, Save, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function UserProfilePanel({ user, onClose }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setProfileData(userDocSnap.data());
          setNewEmail(user.email || '');
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleUpdateEmail = async () => {
    setError('');
    setSuccess('');
    if (!newEmail || newEmail === user.email) {
      setIsEditingEmail(false);
      return;
    }

    try {
      // 1. Update Firebase Auth Email
      if (auth.currentUser) {
         await updateEmail(auth.currentUser, newEmail);
      }
      
      // 2. Update Firestore representation
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { email: newEmail });
      
      setProfileData(prev => ({ ...prev, email: newEmail }));
      setIsEditingEmail(false);
      setSuccess('Email updated successfully.');
    } catch (err) {
      console.error(err);
      if (err.message && err.message.includes("requires-recent-login")) {
         setError("This operation is sensitive and requires recent authentication. Please log in again.");
      } else {
         setError(err.message || 'Failed to update email.');
      }
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" 
        onClick={onClose}
      />
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className="fixed inset-y-0 right-0 w-full sm:w-96 bg-[#05070a] border-l border-accent-500/20 z-[101] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-accent-500/20 bg-accent-500/5">
           <div className="flex items-center gap-2 text-accent-400">
             <User className="w-5 h-5" />
             <span className="font-mono text-sm uppercase tracking-widest font-bold">
               User Profile
             </span>
           </div>
           <button onClick={onClose} className="text-slate-500 hover:text-red-400 transition-colors p-1" title="Close Panel">
             <X className="w-5 h-5" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
           {!user ? (
             <div className="text-center text-slate-500 font-mono text-xs mt-10">
                UNAUTHORIZED ACCESS. CONNECT USER ENTITY.
             </div>
           ) : loading ? (
             <div className="text-accent-500/50 font-mono text-xs text-center mt-10 animate-pulse uppercase tracking-widest">
                Accessing Profile Data...
             </div>
           ) : (
             <div className="space-y-6">

                <div className="flex flex-col items-center justify-center p-6 bg-slate-900/40 border border-slate-800 rounded-lg">
                    <div className="w-16 h-16 rounded-full bg-accent-500/20 border-2 border-accent-500/50 flex items-center justify-center mb-4">
                        <User className="w-8 h-8 text-accent-400" />
                    </div>
                    <div className="text-center font-mono text-slate-300">
                        USER ID: <span className="text-[10px] text-slate-500">{user.uid}</span>
                    </div>
                </div>
                
                {error && (
                  <div className="text-xs p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded flex items-start gap-2">
                     <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                     <p>{error}</p>
                  </div>
                )}
                
                {success && (
                  <div className="text-xs p-3 bg-green-500/10 border border-green-500/30 text-green-400 rounded">
                     {success}
                  </div>
                )}

                <div className="space-y-4">
                    <div className="bg-slate-900/40 p-4 rounded border border-slate-800">
                       <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Registered Email</label>
                       
                       {isEditingEmail ? (
                         <div className="flex items-center gap-2">
                            <input 
                              type="email" 
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              className="flex-1 bg-[#05070a] border border-accent-500/30 text-accent-400 text-sm font-mono p-2 outline-none focus:border-accent-500 rounded"
                            />
                            <button 
                               onClick={handleUpdateEmail}
                               className="p-2 bg-accent-500/20 text-accent-400 border border-accent-500/50 hover:bg-accent-500/30 rounded transition-colors"
                            >
                               <Save className="w-4 h-4" />
                            </button>
                            <button 
                               onClick={() => { setIsEditingEmail(false); setNewEmail(user.email || ''); setError(''); setSuccess(''); }}
                               className="p-2 bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 rounded transition-colors"
                            >
                               <X className="w-4 h-4" />
                            </button>
                         </div>
                       ) : (
                         <div className="flex items-center justify-between">
                             <div className="font-mono text-accent-400 text-sm">{user.email}</div>
                             <button 
                                onClick={() => setIsEditingEmail(true)}
                                className="text-slate-500 hover:text-accent-400 transition-colors p-1"
                             >
                                <Edit2 className="w-4 h-4" />
                             </button>
                         </div>
                       )}
                    </div>

                    <div className="bg-slate-900/40 p-4 rounded border border-slate-800">
                       <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Account Created</label>
                       <div className="font-mono text-slate-300 text-sm">
                           {profileData?.createdAt?.toDate().toLocaleString() || 'Unknown Temporal Code'}
                       </div>
                    </div>
                </div>

             </div>
           )}
        </div>
      </motion.div>
    </>
  );
}
