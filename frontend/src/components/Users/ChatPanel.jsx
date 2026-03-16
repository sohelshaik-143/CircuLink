import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatPanel({ targetUser, currentUser, onClose }) {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // Initial greeting
    useEffect(() => {
        if (targetUser) {
            setMessages([{
                id: Date.now(),
                sender: 'bot',
                text: `Hi ${currentUser.name.split(' ')[0]}! This is an automated response interface for ${targetUser.name}. They are currently offline, but you can leave a message and they will receive it in their portal notifications.`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        }
    }, [targetUser, currentUser]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const newMsg = {
            id: Date.now(),
            sender: 'user',
            text: inputText.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, newMsg]);
        setInputText('');
        setIsTyping(true);

        // Simulate chatbot auto-reply
        setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'bot',
                text: "Thanks for your message! This is a mock response. In a real system, this would be delivered to the user's portal notification system.",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        }, 1500);
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
                    initial={{ x: '100%', opacity: 0.5 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    style={styles.panel}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div style={styles.header}>
                        <div style={styles.headerInfo}>
                            <div style={styles.avatar}>
                                {targetUser?.profilePicture ? (
                                    <img src={`http://localhost:5000${targetUser.profilePicture}`} alt="" style={styles.avatarImg} />
                                ) : (
                                    targetUser?.name[0]
                                )}
                                <div style={styles.onlineDot} />
                            </div>
                            <div>
                                <h3 style={styles.headerName}>{targetUser?.name}</h3>
                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                            Replies via portal
                        </span>
                            </div>
                        </div>
                        <button onClick={onClose} style={styles.closeBtn}>✕</button>
                    </div>

                    <div style={styles.chatArea}>
                        {messages.map((m) => (
                            <motion.div
                                key={m.id}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                style={{
                                    ...styles.messageWrapper,
                                    justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start'
                                }}
                            >
                                <div style={{
                                    ...styles.messageBubble,
                                    ...(m.sender === 'user' ? styles.msgUser : styles.msgBot)
                                }}>
                                    <p style={styles.messageText}>{m.text}</p>
                                    <span style={{
                                        ...styles.messageTime,
                                        color: m.sender === 'user' ? '#e0e7ff' : '#94a3b8'
                                    }}>{m.time}</span>
                                </div>
                            </motion.div>
                        ))}
                        {isTyping && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.typingIndicator}>
                                <div style={styles.typingDot} />
                                <div style={{ ...styles.typingDot, animationDelay: '0.2s' }} />
                                <div style={{ ...styles.typingDot, animationDelay: '0.4s' }} />
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSend} style={styles.inputArea}>
                        <input
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder={`Message ${targetUser?.name.split(' ')[0]}...`}
                            style={styles.input}
                        />
                        <button type="submit" disabled={!inputText.trim() || isTyping} style={{
                            ...styles.sendBtn,
                            opacity: (!inputText.trim() || isTyping) ? 0.5 : 1
                        }}>
                            Send
                        </button>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

const styles = {
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' },
    panel: { width: '100%', maxWidth: '400px', height: '100%', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 25px rgba(0,0,0,0.1)' },
    header: { padding: '1.25rem 1.5rem', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
    headerInfo: { display: 'flex', alignItems: 'center', gap: '1rem' },
    avatar: { width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', position: 'relative' },
    avatarImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' },
    onlineDot: { position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '50%', border: '2px solid #fff' },
    headerName: { margin: '0 0 0.2rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' },
    headerStatus: { margin: 0, fontSize: '0.8rem', color: '#64748b' },
    closeBtn: { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8', transition: 'color 0.2s', padding: '0.5rem' },

    chatArea: { flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' },
    messageWrapper: { display: 'flex', width: '100%' },
    messageBubble: { maxWidth: '80%', padding: '0.75rem 1rem', borderRadius: '1rem', position: 'relative', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    msgUser: { background: 'linear-gradient(135deg, var(--primary), #2563eb)', color: '#fff', borderBottomRightRadius: '0.25rem' },
    msgBot: { background: '#fff', color: '#334155', border: '1px solid #e2e8f0', borderBottomLeftRadius: '0.25rem' },
    messageText: { margin: '0 0 0.25rem 0', fontSize: '0.95rem', lineHeight: 1.5 },
    messageTime: { fontSize: '0.7rem', textAlign: 'right', display: 'block' },

    typingIndicator: { display: 'flex', gap: '0.25rem', padding: '1rem', background: '#fff', borderRadius: '1rem', borderBottomLeftRadius: '0.25rem', width: 'fit-content', border: '1px solid #e2e8f0' },
    typingDot: { width: '8px', height: '8px', backgroundColor: '#94a3b8', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' },

    inputArea: { padding: '1rem', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem' },
    input: { flex: 1, padding: '0.75rem 1rem', borderRadius: '999px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', transition: 'border 0.2s', background: '#f8fafc' },
    sendBtn: { padding: '0.75rem 1.5rem', borderRadius: '999px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }
};
