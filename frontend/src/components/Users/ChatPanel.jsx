import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import CryptoJS from 'crypto-js';
import { messagesAPI, getFileUrl } from '../../api/axios';
import toast from 'react-hot-toast';

// Derive a shared AES key from both user IDs (same key for both parties)
const getKey = (id1, id2) => {
    const sorted = [id1, id2].sort().join('_');
    return CryptoJS.SHA256(sorted + 'rgukt_secure_2026').toString();
};

const encrypt = (text, key) => CryptoJS.AES.encrypt(text, key).toString();
const decrypt = (cipher, key) => {
    try {
        return CryptoJS.AES.decrypt(cipher, key).toString(CryptoJS.enc.Utf8) || cipher;
    } catch {
        return cipher;
    }
};

let socketInstance = null;

export default function ChatPanel({ targetUser, currentUser, onClose }) {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const encKey = getKey(currentUser._id, targetUser._id);

    // Socket.IO connection
    useEffect(() => {
        if (!socketInstance) {
            const socketUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOCKET_URL)
                || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
                    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
                    : window.location.origin);
            socketInstance = io(socketUrl, {
                auth: { token: localStorage.getItem('token') },
            });
        }
        socketInstance.emit('join', currentUser._id);

        socketInstance.on('new_message', ({ message }) => {
            if (
                (message.sender === targetUser._id && message.receiver === currentUser._id) ||
                (message.sender === currentUser._id && message.receiver === targetUser._id)
            ) {
                setMessages(prev => [...prev, message]);
            }
        });

        return () => {
            socketInstance.off('new_message');
        };
    }, [currentUser._id, targetUser._id]);

    // Load conversation history
    useEffect(() => {
        const load = async () => {
            try {
                const res = await messagesAPI.getConversation(targetUser._id);
                setMessages(res.data.messages || []);
            } catch {
                toast.error('Failed to load messages');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [targetUser._id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || sending) return;
        setSending(true);
        try {
            const encrypted = encrypt(inputText.trim(), encKey);
            const res = await messagesAPI.sendText(targetUser._id, encrypted);
            setMessages(prev => [...prev, res.data.message]);
            setInputText('');
        } catch {
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File must be under 10MB');
            return;
        }
        setSending(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await messagesAPI.sendMessage(targetUser._id, formData);
            setMessages(prev => [...prev, res.data.message]);
        } catch {
            toast.error('Failed to send file');
        } finally {
            setSending(false);
            e.target.value = '';
        }
    };

    const renderMessage = (m) => {
        const isMe = m.sender === currentUser._id || m.sender?._id === currentUser._id;
        if (m.fileUrl) {
            const url = getFileUrl(m.fileUrl);
            return m.fileType === 'image'
                ? <img src={url} alt="shared" style={styles.msgImage} onClick={() => window.open(url, '_blank')} />
                : (
                    <a href={url} target="_blank" rel="noopener noreferrer" style={styles.fileLink}>
                        📎 {m.fileName || 'Download file'}
                    </a>
                );
        }
        // Decrypt text
        const text = isMe
            ? decrypt(m.content, encKey)
            : decrypt(m.content, encKey);
        return <p style={styles.messageText}>{text}</p>;
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={styles.overlay}
                onClick={onClose}
            >
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    style={styles.panel}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={styles.header}>
                        <div style={styles.headerInfo}>
                            <div style={styles.avatar}>
                                {targetUser?.profilePicture
                                    ? <img src={getFileUrl(targetUser.profilePicture)} alt="" style={styles.avatarImg} />
                                    : targetUser?.name[0]}
                            </div>
                            <div>
                                <h3 style={styles.headerName}>{targetUser?.name}</h3>
                                <span style={styles.encNote}>🔒 End-to-end encrypted</span>
                            </div>
                        </div>
                        <button onClick={onClose} style={styles.closeBtn}>✕</button>
                    </div>

                    {/* Messages */}
                    <div style={styles.chatArea}>
                        {loading ? (
                            <div style={styles.loadingMsg}>Loading messages...</div>
                        ) : messages.length === 0 ? (
                            <div style={styles.emptyMsg}>
                                <div style={{ fontSize: '2.5rem' }}>💬</div>
                                <p>No messages yet. Say hello!</p>
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Messages are encrypted and stay within the platform</p>
                            </div>
                        ) : (
                            messages.map((m) => {
                                const isMe = m.sender === currentUser._id || m.sender?._id === currentUser._id;
                                return (
                                    <motion.div
                                        key={m._id}
                                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        style={{ ...styles.messageWrapper, justifyContent: isMe ? 'flex-end' : 'flex-start' }}
                                    >
                                        <div style={{ ...styles.messageBubble, ...(isMe ? styles.msgMe : styles.msgThem) }}>
                                            {renderMessage(m)}
                                            <span style={{ ...styles.messageTime, color: isMe ? '#e0e7ff' : '#94a3b8' }}>
                                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {isMe && m.isRead && ' ✓✓'}
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} style={styles.inputArea}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                            accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={sending}
                            style={styles.attachBtn}
                            title="Attach file or photo"
                        >
                            📎
                        </button>
                        <input
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder={`Message ${targetUser?.name.split(' ')[0]}...`}
                            style={styles.textInput}
                            disabled={sending}
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || sending}
                            style={{ ...styles.sendBtn, opacity: (!inputText.trim() || sending) ? 0.5 : 1 }}
                        >
                            {sending ? '...' : '➤'}
                        </button>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

const styles = {
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' },
    panel: { width: '100%', maxWidth: '420px', height: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(0,0,0,0.15)' },

    header: { padding: '1.25rem 1.5rem', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' },
    headerInfo: { display: 'flex', alignItems: 'center', gap: '1rem' },
    avatar: { width: '46px', height: '46px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', overflow: 'hidden', flexShrink: 0 },
    avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
    headerName: { margin: '0 0 0.15rem', fontSize: '1rem', fontWeight: 800, color: '#0f172a' },
    encNote: { fontSize: '0.72rem', color: '#10b981', fontWeight: 600 },
    closeBtn: { background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#94a3b8', padding: '0.4rem' },

    chatArea: { flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' },
    loadingMsg: { textAlign: 'center', color: '#94a3b8', padding: '3rem', fontStyle: 'italic' },
    emptyMsg: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', color: '#64748b', fontSize: '0.95rem', textAlign: 'center' },

    messageWrapper: { display: 'flex', width: '100%' },
    messageBubble: { maxWidth: '78%', padding: '0.65rem 1rem', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', wordBreak: 'break-word' },
    msgMe: { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', borderBottomRightRadius: '0.25rem' },
    msgThem: { background: '#fff', color: '#334155', border: '1px solid #e2e8f0', borderBottomLeftRadius: '0.25rem' },
    messageText: { margin: '0 0 0.2rem', fontSize: '0.93rem', lineHeight: 1.5 },
    messageTime: { fontSize: '0.68rem', display: 'block', textAlign: 'right' },
    msgImage: { maxWidth: '100%', borderRadius: '0.5rem', cursor: 'pointer', display: 'block' },
    fileLink: { color: '#3b82f6', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' },

    inputArea: { padding: '1rem', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem', alignItems: 'center' },
    attachBtn: { background: 'none', border: '1px solid #e2e8f0', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1rem', flexShrink: 0 },
    textInput: { flex: 1, padding: '0.65rem 1rem', borderRadius: '999px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.93rem', background: '#f8fafc' },
    sendBtn: { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: '1rem', flexShrink: 0, transition: 'opacity 0.2s' },
};
